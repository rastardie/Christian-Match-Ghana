import React, { useState, useEffect } from 'react';
import { FileMetadata, getUserFiles, deleteFile } from '../services/fileStorageService';
import { 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  Calendar, 
  FileText,
  X,
  AlertCircle
} from 'lucide-react';

interface FileHistoryViewProps {
  userId: string;
  onClose: () => void;
}

const FileHistoryView: React.FC<FileHistoryViewProps> = ({ userId, onClose }) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [userId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const userFiles = await getUserFiles(userId);
      setFiles(userFiles);
    } catch (err: any) {
      console.error('Error loading files:', err);
      setError('Failed to load files: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (file: FileMetadata) => {
    if (!confirm(`Delete ${file.fileName}? This cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(file.fileId);
      await deleteFile(userId, file.fileId, file.storagePath);
      setFiles(files.filter(f => f.fileId !== file.fileId));
    } catch (err: any) {
      console.error('Error deleting file:', err);
      alert('Failed to delete file: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'profile_photo': return 'Profile Photo';
      case 'cover_photo': return 'Cover Photo';
      case 'gallery_photo': return 'Gallery Photo';
      default: return 'File';
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'profile_photo': return 'bg-blue-100 text-blue-700';
      case 'cover_photo': return 'bg-purple-100 text-purple-700';
      case 'gallery_photo': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-brand-blue tracking-tight">
              File History
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              All your uploaded files and photos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange mx-auto mb-4"></div>
                <p className="text-gray-500">Loading files...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-semibold">{error}</p>
                <button
                  onClick={loadFiles}
                  className="mt-4 px-6 py-2 bg-brand-orange text-white rounded-full font-bold"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">No files uploaded yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Upload photos in your profile to see them here
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <div
                  key={file.fileId}
                  className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-brand-orange transition-all"
                >
                  {/* Preview */}
                  <div className="aspect-[4/3] bg-gray-100 relative">
                    {file.mimeType.startsWith('image/') ? (
                      <img
                        src={file.downloadURL}
                        alt={file.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText size={48} className="text-gray-300" />
                      </div>
                    )}
                    
                    {/* File Type Badge */}
                    <div className="absolute top-2 left-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${getFileTypeColor(
                          file.fileType
                        )}`}
                      >
                        {getFileTypeLabel(file.fileType)}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="font-bold text-sm text-gray-800 truncate mb-2">
                      {file.fileName}
                    </p>
                    
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <FileText size={14} />
                        <span>{formatFileSize(file.fileSize)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{formatDate(file.uploadedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <a
                        href={file.downloadURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-opacity-90 transition-all"
                      >
                        <Download size={14} />
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(file)}
                        disabled={deleting === file.fileId}
                        className="px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
                        title="Delete file"
                      >
                        {deleting === file.fileId ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && files.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              {files.length} file{files.length !== 1 ? 's' : ''} •{' '}
              {formatFileSize(files.reduce((sum, f) => sum + f.fileSize, 0))} total
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileHistoryView;
