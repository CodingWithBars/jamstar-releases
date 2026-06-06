const ytdl = require('@distube/ytdl-core');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing YouTube video ID (id parameter)' });
  }

  try {
    const info = await ytdl.getInfo(id);
    
    // Select the best audio format
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    
    if (!format || !format.url) {
      return res.status(404).json({ error: 'No audio stream found' });
    }

    // We MUST pipe the stream through Vercel because YouTube streams are IP-bound.
    // If we just redirected, the user's mobile IP would get a 403 Forbidden since it differs from Vercel's IP.
    res.setHeader('Content-Type', format.mimeType || 'audio/mp4');
    
    ytdl(id, { format: format })
      .on('error', (err) => {
        console.error('YTDL Error:', err);
        if (!res.headersSent) res.status(500).send(err.message);
      })
      .pipe(res);

  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};
