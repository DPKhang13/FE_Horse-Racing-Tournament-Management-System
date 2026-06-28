import { apiClient, unwrapApiData } from './apiClient';

export type UploadResponse = {
  uploadId?: number;
  id?: number;
  entityId?: number;
  secureUrl?: string;
  url?: string;
  publicId?: string;
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
  uploadUserImage(userId: number | string, file: File): Promise<UploadResponse> {
    return uploadImage(`/api/uploads/users/${userId}`, file);
  },

  uploadHorseImage(horseId: number | string, file: File): Promise<UploadResponse> {
    return uploadImage(`/api/uploads/horses/${horseId}`, file);
  },
};
