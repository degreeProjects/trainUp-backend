import * as path from "path";
import { Request, Response } from "express";
import multer from "multer";

const uploadFilePath = path.resolve(__dirname, "../..", "public/uploads");

// Configure disk storage so every upload lands under /public/uploads and gets a
// timestamp-based filename to avoid collisions.
const storageFile: multer.StorageEngine = multer.diskStorage({
  destination: uploadFilePath,
  filename(
    req: Request,
    file: Express.Multer.File,
    fn: (error: Error | null, filename: string) => void
  ): void {
    fn(
      null,
      `${new Date().getTime().toString()}-${file.fieldname}${path.extname(
        file.originalname
      )}`
    );
  },
});

const uploadFile = multer({
  storage: storageFile,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    // Lock uploads down to common image formats to prevent users from storing
    // arbitrary content on the server.
    const extension: boolean =
      [".png", ".jpg", ".jpeg"].indexOf(
        path.extname(file.originalname).toLowerCase()
      ) >= 0;
    const mimeType: boolean =
      ["image/png", "image/jpg", "image/jpeg"].indexOf(file.mimetype) >= 0;

    if (extension && mimeType) {
      return callback(null, true);
    }

    callback(
      new Error(
        "Invalid file type. Only picture file on type PNG and JPG are allowed!"
      )
    );
  },
}).single("picture");

const handleSingleUploadFile = async (
  req: Request,
  res: Response
): Promise<{ file: Express.Multer.File | undefined; body: unknown }> => {
  // Wrap Multer's callback signature so controllers can `await` uploads and
  // share a consistent error-handling path.
  return new Promise((resolve, reject): void => {
    uploadFile(req, res, (error) => {
      if (error) {
        reject(error);
      }

      resolve({ file: req.file, body: req.body });
    });
  });
};

export { handleSingleUploadFile };
