/**
 * 일반, 드래프트 모두에서 사용되는 이미지 API.
 * 공통적으로 사용하기에는 코드가 좋지 않습니다.
 * 추후에 리팩토링이 필요합니다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@shared/api/hooks/useApi";
import { API_URL } from "../base";
import type {
  ImageApiResponse,
  ImageUploadResponse,
  ImageDeleteResponse,
} from "./types";

const BASE_URL = `${API_URL}/api/images/draftReview`;

export const useReviewImageApi = (draftReviewId?: number) => {
  const { post, remove } = useApi<ImageApiResponse>();
  const { get } = useApi();
  const prevUrls = useRef(new Set<string>());
  const imageCache = useRef(new Map<string, {url: string, modified: number|null}>());
  
  const upload = useCallback(
    async (file: File): Promise<string> => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await post<ImageUploadResponse>(
          `${BASE_URL}/${draftReviewId}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        return response.imageId;
      } catch (error) {
        throw new Error("Failed to upload image: " + error);
      }
    },
    [post, draftReviewId]
  );

  const removeImage = useCallback(
    async (imageId: string): Promise<void> => {
      await remove(
        `${BASE_URL}?draftReviewId=${draftReviewId}&imageId=${imageId}`
      );
    },
    [remove, draftReviewId]
  );

  const getUrl = useCallback(
    (imageId: string): string => {
      return `${BASE_URL}?draftReviewId=${draftReviewId}&imageId=${imageId}`;
    },
    [draftReviewId]
  );
  
  const getImageUrlWithModified = useCallback(
    async (imageId: string): Promise<{imageUrl: string|null; modified: number|null}> => {
      // 이미지가 캐시되어 있는지 확인
      if (imageCache.current.has(imageId)) {
        const cached = imageCache.current.get(imageId)!;
        return { imageUrl: cached.url, modified: cached.modified };
      }
      
      try {
        const response = await get<Response>(
          `${API_URL}/api/images/review/${imageId}`, {
            responseType: "blob",
            transformResponse: (data, headers) => ({ blob:data, headers }),  //headers 유지
          }
        );
        const modifiedHeader = response.headers?.["last-modified"];
        const modified = modifiedHeader ? Date.parse(modifiedHeader) : null;
          
        const blob = response.blob;
        if (!(blob instanceof Blob)) throw new Error("응답 데이터가 Blob이 아닙니다.");

        const imageUrl = URL.createObjectURL(blob);
        imageCache.current.set(imageId, {url: imageUrl, modified}); // 이미지 캐싱
        prevUrls.current.add(imageUrl);
        return { imageUrl, modified };
      } catch (error) {
        console.error("이미지 불러오기 실패:", error);
        return { imageUrl: null, modified: null };
      }
    },
    [get]
  );


  // useEffect의 cleanup 함수 (컴포넌트 언마운트 될때 실행)
  // 새로고침 또는 페이지 벗어날 때 URL 해제
  useEffect(() => {
    return () => {
      if (prevUrls.current.size > 0){
      prevUrls.current.forEach((url) => URL.revokeObjectURL(url));
      prevUrls.current.clear();
      }
      imageCache.current.clear();
    };
  }, []);

  // 일반 리뷰의 이미지인 경우
  const getImageUrl = (imageId: string) => {
    return `${API_URL}/api/images/review/${imageId}`;
  };

  // draft 상태일 때의 이미지 URL(아직 사용되지 않음)
  const getDraftImageUrl = (imageId: string) => {
    return `${API_URL}/api/images/draftReview?draftReviewId=${draftReviewId}&imageId=${imageId}`;
  };

  // 프로필 이미지인 경우
  const getProfileImageUrl = (userId: string) => {
    return `${API_URL}/api/images/profile/${userId}`
  }

  return useMemo(
    () => ({
      upload,
      remove: removeImage,
      getUrl,
      getImageUrl,
      getDraftImageUrl,
      getProfileImageUrl,
      getImageUrlWithModified,
    }),
    [upload, removeImage, getUrl, getImageUrl, getDraftImageUrl, getProfileImageUrl, getImageUrlWithModified]
  );
};
