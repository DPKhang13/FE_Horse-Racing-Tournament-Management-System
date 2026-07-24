import { apiClient, unwrapApiData } from './apiClient';

export type UploadResponse = {
  uploadId?: number;
  id?: number;
  entityId?: number;
  secureUrl?: string;
  url?: string;
  publicId?: string;
  folder?: string;
  resourceType?: string;
};

const uploadImage = async (endpoint: string, file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return unwrapApiData<UploadResponse>(response);
};

export const uploadService = {
  uploadNewUserImage(file: File): Promise<UploadResponse> {
    return uploadImage('/api/uploads/users', file);
  },

  uploadUserImage(userId: number | string, file: File): Promise<UploadResponse> {
    return uploadImage(`/api/uploads/users/${userId}`, file);
  },

  uploadNewHorseImage(file: File): Promise<UploadResponse> {
    return uploadImage('/api/uploads/horses', file);
  },

  uploadHorseImage(horseId: number | string, file: File): Promise<UploadResponse> {
    return uploadImage(`/api/uploads/horses/${horseId}`, file);
  },
};

export const getUploadedImageUrl = (response: UploadResponse) => response.secureUrl || response.url || '';
