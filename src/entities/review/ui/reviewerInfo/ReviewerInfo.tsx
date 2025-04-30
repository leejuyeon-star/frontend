import { useState, useRef, useEffect } from "react";
import styles from "./ReviewerInfo.module.scss";
import SimpleStarRating from "@/widgets/simpleStarRating/ui/SimpleStarRating";
import ReviewMore from "../reviewMore/ReviewMore";
import profileIcon from "@shared/assets/images/profile/profile.svg";
import myProfileIcon from "@shared/assets/images/profile/myProfile.svg";
import moreIcon from "@shared/assets/images/more.svg";
import { useProfileImageApi } from "@/shared/api/user/useProfileImagesApi";
import { useNavigate } from "react-router-dom";
import { useReviewImageApi } from "@/shared/api/images";

interface ReviewerInfoProps {
  nickname: string;
  visitDate: string;
  rating: number;
  isProfileImageExist: boolean;
  reviewId: number;
  userId: number;
  currentUserId?: number;
}

const ReviewerInfo = ({ 
  nickname, 
  visitDate, 
  rating, 
  isProfileImageExist,
  reviewId,
  userId,
  currentUserId 
}: ReviewerInfoProps) => {
  const [showReviewMore, setShowReviewMore] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const reviewMoreRef = useRef<HTMLDivElement | null>(null);
  const isOwner = currentUserId === userId;
  const navigate = useNavigate();
  const { getProfileImageUrl } = useReviewImageApi();
  const profileImageUrl = getProfileImageUrl(String(userId));

  // 표시할 버튼 개수 계산
  const getVisibleButtonCount = () => {
    let count = 0;
    if (isOwner) {
      count += 2; // 수정, 삭제 버튼
    }
    // 향후 다른 버튼들이 추가될 때마다 조건에 따라 카운트 증가
    // 예: if (canShare) count++;
    return count;
  };

  const hasVisibleButtons = getVisibleButtonCount() > 0;

  const toggleReviewMore = () => {
    setShowReviewMore((prev) => !prev);
  };

  const handleClickOutside = (event: MouseEvent) => {
    // 모달이 열려있을 때는 클릭 이벤트를 무시
    if (isModalOpen) return;
    
    if (
      reviewMoreRef.current &&
      !reviewMoreRef.current.contains(event.target as Node)
    ) {
      setShowReviewMore(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  const formatVisitDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\./g, '.');
  };

  return (
    <div>
    <div className={styles.reviewerInfo}>
        <img
          onClick={()=>{navigate(`/userpage/${userId}`)}}
          className={styles.reviewerInfo__profilePicture}
          src={(isProfileImageExist && profileImageUrl) || (isOwner ? myProfileIcon : profileIcon)}
          alt={`${nickname}의 프로필`}
        />
        <div className={styles.reviewerInfo__details}>
          <p className={styles.reviewerInfo__name}>{nickname}</p>
          <div className={styles.reviewerInfo__meta}>
            <p className={styles.reviewerInfo__visitDate}>
              {formatVisitDate(visitDate)} 방문
            </p>
            <p>・</p>
            <SimpleStarRating rating={rating} />
          </div>
        </div>

        {hasVisibleButtons && (
          <div ref={reviewMoreRef} className={styles.reviewerInfo__moreWrapper}>
            <img
              className={styles.reviewerInfo__moreIcon}
              src={moreIcon}
              alt="더보기 아이콘"
              onClick={toggleReviewMore}
            />
            {showReviewMore && (
              <ReviewMore 
                reviewId={reviewId}
                isOwner={isOwner}
                onDelete={() => setShowReviewMore(false)}
                onModalOpen={() => setIsModalOpen(true)}
                onModalClose={() => setIsModalOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewerInfo;
