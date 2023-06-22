import fs from 'fs';
import path from 'path';
import similarity from 'string-similarity';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { pdfFilename, bestMatchPageIndex } = req.body;

    // Directory where images are stored
    const imagesDir = path.join(process.cwd(), 'public', 'images');

    // List all files in the directory
    const files = fs.readdirSync(imagesDir);

    // Pattern to match
    const pattern = `${pdfFilename.replace(/\.[^/.]+$/, "")}-page${bestMatchPageIndex}`;

    // Find the file that has the most match with the pattern
    let maxSimilarity = 0;
    let bestMatchFile = null;
    files.forEach(file => {
      const score = similarity.compareTwoStrings(pattern, file);
      if (score > maxSimilarity) {
        maxSimilarity = score;
        bestMatchFile = file;
      }
    });

    console.log(`bestMatchFile: ${bestMatchFile}`);

    // Return the matching file
    if (bestMatchFile) {
      res.status(200).json({ imageSrc: `/images/${bestMatchFile}` });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
