// File management routes for Premium Gift Box backend
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

async function fileRoutes(fastify, options) {
  const db = fastify.db;
  const uploadsDir = path.join(__dirname, '../../uploads');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

  // Ensure upload directories exist
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(thumbnailsDir, { recursive: true });

  // Upload file endpoint
  fastify.post('/upload', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Generate unique filename
      const fileId = uuidv4();
      const ext = path.extname(data.filename);
      const filename = `${fileId}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      // Save file to disk
      const buffer = await data.toBuffer();
      await fs.writeFile(filepath, buffer);

      // Get file stats
      const stats = await fs.stat(filepath);

      // Generate thumbnail if image
      let thumbnailPath = null;
      if (data.mimetype.startsWith('image/')) {
        const thumbnailFilename = `${fileId}_thumb${ext}`;
        thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

        await sharp(buffer)
          .resize(200, 200, {
            fit: 'cover',
            position: 'center'
          })
          .toFile(thumbnailPath);
      }

      // Save file metadata to database
      const fileRecord = {
        id: fileId,
        filename: data.filename,
        stored_filename: filename,
        mimetype: data.mimetype,
        size: stats.size,
        uploaded_by: request.user.id,
        has_thumbnail: !!thumbnailPath
      };

      await db.createFile(fileRecord);

      return {
        success: true,
        file: {
          id: fileId,
          filename: data.filename,
          mimetype: data.mimetype,
          size: stats.size,
          url: `/api/files/${fileId}`,
          thumbnailUrl: thumbnailPath ? `/api/files/${fileId}/thumbnail` : null
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'File upload failed' });
    }
  });

  // Upload multiple files
  fastify.post('/upload-multiple', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const parts = request.parts();
      const uploadedFiles = [];

      for await (const part of parts) {
        if (part.type === 'file') {
          // Generate unique filename
          const fileId = uuidv4();
          const ext = path.extname(part.filename);
          const filename = `${fileId}${ext}`;
          const filepath = path.join(uploadsDir, filename);

          // Save file to disk
          const buffer = await part.toBuffer();
          await fs.writeFile(filepath, buffer);

          // Get file stats
          const stats = await fs.stat(filepath);

          // Generate thumbnail if image
          let thumbnailPath = null;
          if (part.mimetype.startsWith('image/')) {
            const thumbnailFilename = `${fileId}_thumb${ext}`;
            thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

            await sharp(buffer)
              .resize(200, 200, {
                fit: 'cover',
                position: 'center'
              })
              .toFile(thumbnailPath);
          }

          // Save file metadata to database
          const fileRecord = {
            id: fileId,
            filename: part.filename,
            stored_filename: filename,
            mimetype: part.mimetype,
            size: stats.size,
            uploaded_by: request.user.id,
            has_thumbnail: !!thumbnailPath
          };

          await db.createFile(fileRecord);

          uploadedFiles.push({
            id: fileId,
            filename: part.filename,
            mimetype: part.mimetype,
            size: stats.size,
            url: `/api/files/${fileId}`,
            thumbnailUrl: thumbnailPath ? `/api/files/${fileId}/thumbnail` : null
          });
        }
      }

      return {
        success: true,
        files: uploadedFiles,
        count: uploadedFiles.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Multiple file upload failed' });
    }
  });

  // Get file by ID
  fastify.get('/:fileId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { fileId } = request.params;

      const fileRecord = await db.getFileById(fileId);

      if (!fileRecord) {
        return reply.status(404).send({ error: 'File not found' });
      }

      const filepath = path.join(uploadsDir, fileRecord.stored_filename);

      // Check if file exists
      try {
        await fs.access(filepath);
      } catch {
        return reply.status(404).send({ error: 'File not found on disk' });
      }

      // Stream file
      return reply
        .type(fileRecord.mimetype)
        .send(await fs.readFile(filepath));
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to retrieve file' });
    }
  });

  // Get thumbnail by ID
  fastify.get('/:fileId/thumbnail', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { fileId } = request.params;

      const fileRecord = await db.getFileById(fileId);

      if (!fileRecord) {
        return reply.status(404).send({ error: 'File not found' });
      }

      if (!fileRecord.has_thumbnail) {
        return reply.status(404).send({ error: 'Thumbnail not available' });
      }

      const ext = path.extname(fileRecord.stored_filename);
      const thumbnailFilename = `${fileId}_thumb${ext}`;
      const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

      // Check if thumbnail exists
      try {
        await fs.access(thumbnailPath);
      } catch {
        return reply.status(404).send({ error: 'Thumbnail not found on disk' });
      }

      // Stream thumbnail
      return reply
        .type(fileRecord.mimetype)
        .send(await fs.readFile(thumbnailPath));
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to retrieve thumbnail' });
    }
  });

  // Get file metadata
  fastify.get('/:fileId/metadata', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { fileId } = request.params;

      const fileRecord = await db.getFileById(fileId);

      if (!fileRecord) {
        return reply.status(404).send({ error: 'File not found' });
      }

      return {
        file: {
          id: fileRecord.id,
          filename: fileRecord.filename,
          mimetype: fileRecord.mimetype,
          size: fileRecord.size,
          uploadedBy: fileRecord.uploaded_by,
          uploadedAt: fileRecord.created_at,
          url: `/api/files/${fileRecord.id}`,
          thumbnailUrl: fileRecord.has_thumbnail ? `/api/files/${fileRecord.id}/thumbnail` : null
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to retrieve file metadata' });
    }
  });

  // Delete file
  fastify.delete('/:fileId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { fileId } = request.params;

      const fileRecord = await db.getFileById(fileId);

      if (!fileRecord) {
        return reply.status(404).send({ error: 'File not found' });
      }

      // Check if user owns the file or is admin
      if (fileRecord.uploaded_by !== request.user.id && request.user.role !== 'owner') {
        return reply.status(403).send({ error: 'Permission denied' });
      }

      // Delete file from disk
      const filepath = path.join(uploadsDir, fileRecord.stored_filename);
      try {
        await fs.unlink(filepath);
      } catch (error) {
        fastify.log.error('Failed to delete file from disk:', error);
      }

      // Delete thumbnail if exists
      if (fileRecord.has_thumbnail) {
        const ext = path.extname(fileRecord.stored_filename);
        const thumbnailFilename = `${fileId}_thumb${ext}`;
        const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
        try {
          await fs.unlink(thumbnailPath);
        } catch (error) {
          fastify.log.error('Failed to delete thumbnail from disk:', error);
        }
      }

      // Delete from database
      await db.deleteFile(fileId);

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to delete file' });
    }
  });

  // List files by user
  fastify.get('/user/:userId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { userId } = request.params;

      // Only allow users to see their own files unless admin
      if (userId !== request.user.id && request.user.role !== 'owner') {
        return reply.status(403).send({ error: 'Permission denied' });
      }

      const files = await db.getFilesByUser(userId);

      return {
        files: files.map(f => ({
          id: f.id,
          filename: f.filename,
          mimetype: f.mimetype,
          size: f.size,
          uploadedAt: f.created_at,
          url: `/api/files/${f.id}`,
          thumbnailUrl: f.has_thumbnail ? `/api/files/${f.id}/thumbnail` : null
        }))
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to retrieve files' });
    }
  });

  // Get file statistics
  fastify.get('/stats/summary', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const stats = await db.getFileStats();

      return {
        totalFiles: stats.count || 0,
        totalSize: stats.size || 0,
        totalSizeMB: ((stats.size || 0) / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to retrieve file statistics' });
    }
  });
}

module.exports = fileRoutes;
