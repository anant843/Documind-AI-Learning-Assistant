import fs from 'fs/promises';
import mongoose from 'mongoose';

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'documentFiles'
});

export const storePdf = async (filePath, filename, metadata = {}) => {
    const data = await fs.readFile(filePath);
    return new Promise((resolve, reject) => {
        const stream = bucket().openUploadStream(filename, {
            contentType: 'application/pdf',
            metadata
        });
        stream.on('error', reject);
        stream.on('finish', () => resolve(stream.id));
        stream.end(data);
    });
};

export const openPdfStream = (fileId) =>
    bucket().openDownloadStream(new mongoose.Types.ObjectId(fileId));

export const deletePdf = async (fileId) => {
    if (!fileId) return;
    await bucket().delete(new mongoose.Types.ObjectId(fileId));
};
