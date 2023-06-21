import fs from 'fs';
import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { pinecone } from '@/utils/pinecone-client';
import { CustomPDFLoader } from '@/utils/customPDFLoader';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';

import { PDFDocument, rgb } from 'pdf-lib';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import * as pdfPoppler from 'pdf-poppler';

/* Name of directory to retrieve your files from */
const filePath = 'docs';

export const run = async () => {
  try {
    /*load raw docs from the all files in the directory */
    const directoryLoader = new DirectoryLoader(filePath, {
      '.pdf': (path) => new CustomPDFLoader(path),
    });

    // const loader = new PDFLoader(filePath);
    const rawDocs = await directoryLoader.load();

    // Ensure the output directory exists
    const outputDir = path.resolve('public', 'images');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    console.log(`outputDir: ${outputDir}`);

    // Convert each page of each PDF to an image
    for (const rawDoc of rawDocs) {
      const pdfFilePath = rawDoc.metadata.source;
      const pdf = await PDFDocument.load(fs.readFileSync(pdfFilePath));
      const pageCount = pdf.getPages().length;

      for (let i = 1; i <= pageCount; i++) {
        const outputImagePath = path.join(outputDir, `${path.basename(pdfFilePath, '.pdf')}-page${i}.png`);
        console.log(`outputImagePath: ${outputImagePath}`);

        const opts = {
          format: 'png',
          page: i,
          out_dir: path.dirname(outputImagePath),
          out_prefix: path.basename(outputImagePath, '.png'),
          scale: 1024 // Scale to 1024px width (optional)
        };

        await pdfPoppler.convert(pdfFilePath, opts);
      }
    }

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log('split docs', docs);

    console.log('creating vector store...');
    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings();
    const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name

    //embed the PDF documents
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: PINECONE_NAME_SPACE,
      textKey: 'text',
    });
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();
