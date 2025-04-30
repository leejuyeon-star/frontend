import { Swiper, SwiperSlide } from "swiper/react";
import Chips from "../chips/Chips";
import "swiper/css";
import "swiper/css/pagination";
import styles from "./PhotoSwiper.module.scss";
import { Pagination } from "swiper/modules";
import { FC, useEffect, useRef, useState } from "react";
import { useReviewImageApi } from "@shared/api/images";
import FullScreenViewer from "../fullScreenViewer/FullScreenViewer";
import Lottie from "lottie-react";
import spinnerAnimation from '@shared/assets/images/spinner.json';

interface PhotoSwiperProps {
  imageIds: string[];
  showChips?: boolean;
  cafeName?: string;
  cafeId?: number;
}

const PhotoSwiper: FC<PhotoSwiperProps> = ({
  imageIds,
  showChips = true,
  cafeName = "",
  cafeId,
}) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [initialSlideIndex, setInitialSlideIndex] = useState(0);
  const { getImageUrlWithModified } = useReviewImageApi();
  const [ isAllImageLoading, setIsAllImageLoading ] = useState(true);
  const [images, setImages] = useState<{ imageId: string; imageUrl: string; modified: number }[]>([]);


  // imageIds가 없고 cafeName과 showChips가 있는 경우에도 Chips 렌더링
  if ((!imageIds || imageIds.length === 0) && showChips && cafeName) {
    return (
      <div className={styles.chipsOnly}>
        <Chips cafeName={cafeName} cafeId={cafeId} />
      </div>
    );
  }

  // 이미지와 Chips가 모두 없는 경우 렌더링하지 않음
  if (!imageIds || imageIds.length === 0) {
    return null;
  }

  useEffect(() => {
    // 모든 이미지 다 받을때까지 무한 로딩
    const fetchImageUrls = async () => {
      const newImages = await Promise.all(
        imageIds.map(async (imageId) => {
          const { imageUrl, modified } = await getImageUrlWithModified(imageId);
          if (imageUrl === null || modified === null) throw new Error("이미지 로드 실패했습니다.");
          return { imageId, imageUrl, modified,};
        })
      );
      // modified 오래된 날짜 순으로 이미지 정렬
      setImages(newImages.sort((a, b) => (a.modified ?? 0) - (b.modified ?? 0)));
    };
  
    if (imageIds && imageIds.length > 0) {
      fetchImageUrls();
    }
  }, [imageIds]);


  useEffect(() => {
    if (images.length > 0){
      setIsAllImageLoading(false);
    }
  }, [images])


  return (
    <>
      {isAllImageLoading ? 
        <div className={styles.swiper__loading}>
          <Lottie
          animationData={spinnerAnimation}
          style={{ width: 40, height: 40 }}
          loop={true}
          />
        </div>
        : <><Swiper
          className={styles.swiper}
          pagination={true}
          modules={[Pagination]}
          spaceBetween={50}
          slidesPerView={1}
        >
          {images.map((image, index) => (
            <SwiperSlide
              key={image.imageId}
              className={styles.swiperSlide}
              onClick={() => {
                setInitialSlideIndex(index);
                setViewerOpen(true);
              }}
            >
              <img
                src={image.imageUrl}
                alt="Review"
                className={styles.image}
              />
              {showChips && cafeName && (
                <div
                  className={styles.chipsWrap}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Chips cafeName={cafeName} cafeId={cafeId} />
                </div>
              )}
            </SwiperSlide>
          ))}
          </Swiper>

          {viewerOpen && !isAllImageLoading && (
            <FullScreenViewer
            images={images.map(image => (image.imageUrl))}
            initialIndex={initialSlideIndex}
            onClose={() => setViewerOpen(false)}
            />
          )}
        </>
      }
    </>
  );
};

export default PhotoSwiper;
