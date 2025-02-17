import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CafeList } from "@widgets/cafeList";
import { SearchBar } from "@features/search/ui/SearchBar";
import { useCafeSearch } from "@shared/api/cafe/cafeSearch";
import { useReviewDraftStore } from "@shared/store/useReviewDraftStore";
import { useNavigationStore } from "@shared/store/useNavigationStore";
import type { ICafeDescription } from "@shared/api/cafe/types";
import { useCafeApi } from "@/shared/api/cafe/cafe";
import { useReviewDraftApi } from "@shared/api/reviews/reviewDraftApi";
import Modal from "@shared/ui/modal/Modal";
import styles from "./styles/CafeSearch.module.scss";
import { Tabs } from "@shared/ui/tabs/Tabs";
import type { Tab } from "@shared/ui/tabs/types";

const CafeSearch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateDraft, clearDraft } = useReviewDraftStore();
  const { returnPath, setReturnPath, isFromFooter, setIsFromFooter } =
    useNavigationStore();
  const { searchByName, isLoading: isCafeLoading, error: cafeError } = useCafeSearch();

  // TODO: 프로필 검색 구현 필요
  // const { searchByName, isLoading: isProfileLoading, error: profileError } = useProfileSearch();

  const { checkCafeExists, saveCafe } = useCafeApi();
  const { useUserDraftReviews, createDraft } = useReviewDraftApi();
  const [cafes, setCafes] = useState<ICafeDescription[]>([]);

  // TODO: 프로필 타입 정의 필요
  // const [profiles, setProfiles] = useState<any[]>([]);

  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState<{
    cafe: ICafeDescription;
    cafeId: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("cafe");

  const tabs: Tab[] = [
    { id: "cafe", label: "카페" },
    { id: "profile", label: "프로필" },
  ];

  useEffect(() => {
    console.log("selectedCafe updated:", selectedCafe);
  }, [selectedCafe]);

  const draftsQuery = useUserDraftReviews(selectedCafe?.cafeId, {
    enabled:
      selectedCafe !== null &&
      typeof selectedCafe?.cafeId === "number" &&
      selectedCafe.cafeId > 0, // cafeId가 유효한 값인 경우에만 쿼리 실행
  });

  const handleCafeSelect = async (cafe: ICafeDescription) => {
    try {
      const { cafeId, exist } = await checkCafeExists({
        name: cafe.name,
        mapx: cafe.mapx,
        mapy: cafe.mapy,
      });

      if (typeof cafeId === "undefined") {
        console.error("카페 ID가 정의되지 않았습니다.");
        return;
      }

      let selectedCafeId = cafeId;

      if (!exist) {
        const saveResponse = await saveCafe({
          title: cafe.name,
          category: cafe.category,
          mapx: cafe.mapx,
          mapy: cafe.mapy,
          address: cafe.address,
          roadAddress: cafe.roadAddress,
          link: cafe.link,
        });

        if (saveResponse.cafeId) {
          selectedCafeId = saveResponse.cafeId;
        } else {
          console.error("카페 저장 실패");
          return;
        }
      }

      if (isFromFooter) {
        navigate(`/cafe/${selectedCafeId}`);
        return;
      }

      setSelectedCafe({ cafe, cafeId: selectedCafeId });
    } catch (error) {
      console.error("카페 선택 중 오류 발생:", error);
    }
  };

  const handleNewDraft = async (cafe: ICafeDescription, cafeId: number) => {
    try {
      const response = await createDraft({
        cafeId: cafeId,
        rating: 0,
        visitDate: "",
        content: "",
        imageIds: [],
        tagIds: [],
      });

      console.log("Draft 생성:", response);

      await updateDraft({
        id: response.draftReviewId,
        cafe: {
          ...cafe,
          id: cafeId,
        },
        rating: response.rating,
        visitDate: response.visitDate,
        content: response.content,
        imageIds: response.imageIds,
        tags: {
          menu: response.tagIds.filter((id) => id >= 1 && id <= 99),
          interior: response.tagIds.filter((id) => id >= 100),
        },
      });

      // replace: true로 설정하여 현재 /search 페이지를 대체
      navigate("/review/write", {
        replace: true,
        state: {
          from: "/search",
          preventBack: true,
        },
      });
    } catch (error) {
      console.error("Draft 생성 실패:", error);
    }
  };

  const handleContinueWriting = () => {
    if (!selectedCafe) return;

    // draftsQuery 사용
    if (!draftsQuery.data) return;

    if (draftsQuery.data.length === 1) {
      const draft = draftsQuery.data[0];
      updateDraft({
        id: draft.draftReviewId,
        cafe: {
          id: selectedCafe.cafeId,
          name: draft.cafeName,
        },
      });
      navigate("/review/write", {
        state: {
          from: "/search",
          searchParams: window.location.search,
          isContinue: true,
        },
      });
    } else {
      navigate("/draft", {
        state: {
          cafeId: selectedCafe.cafeId,
          from: "/search",
          searchParams: window.location.search,
        },
      });
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (shouldNavigate) {
      navigate("/review/write", {
        replace: true,
        state: { from: "/search" },
      });
      setShouldNavigate(false);
    }
  }, [shouldNavigate, navigate]);

  // 검색어와 탭이 변경될 때마다 해당 탭의 검색 실행
  useEffect(() => {
    const query = searchParams.get("name");
    if (!query) return;

    switch (activeTab) {
      case "cafe":
        // TODO: 프로필 검색 결과 초기화
        searchByName(query).then(setCafes);
        break;
      case "profile":
        // 카페 검색 결과 초기화
        setCafes([]);
        // TODO: 프로필 검색 API 호출
        break;
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    // selectedCafe와 draftsQuery.data가 모두 있을 때만 실행
    if (!selectedCafe || !draftsQuery.data) return;

    if (draftsQuery.data.length > 0 && !shouldNavigate) {
      // shouldNavigate가 false일 때만 모달 표시
      setIsModalOpen(true);
    } else {
      handleNewDraft(selectedCafe.cafe, selectedCafe.cafeId);
    }
  }, [draftsQuery.data, selectedCafe, shouldNavigate]);

  const renderContent = () => {
    switch (activeTab) {
      case "cafe":
        return (
          <div className={styles.cafeListContainer}>
            {isCafeLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>검색 중입니다...</p>
              </div>
            ) : cafeError ? (
              <div className={styles.errorContainer}>
                <p>카페 검색 중 오류가 발생했습니다.</p>
              </div>
            ) : cafes.length === 0 ? (
              <div className={styles.noResults}>
                <p>검색 결과가 없습니다.</p>
              </div>
            ) : (
              <CafeList cafeInfo={cafes} onCafeSelect={handleCafeSelect} />
            )}
          </div>
        );
      case "profile":
        return (
          <div className={styles.noResults}>
            <p>프로필 검색 기능은 준비 중입니다.</p>
          </div>
          // TODO: 프로필 검색 구현 필요
          // <div className={styles.profileListContainer}>
          //   {isProfileLoading ? (
          //     <div className={styles.loadingContainer}>
          //       <div className={styles.loadingSpinner}></div>
          //       <p>검색 중입니다...</p>
          //     </div>
          //   ) : profileError ? (
          //     <div className={styles.errorContainer}>
          //       <p>프로필 검색 중 오류가 발생했습니다.</p>
          //     </div>
          //   ) : profiles.length === 0 ? (
          //     <div className={styles.noResults}>
          //       <p>검색 결과가 없습니다.</p>
          //     </div>
          //   ) : (
          //     <ProfileList profileInfo={profiles} onProfileSelect={handleProfileSelect} />
          //   )}
          // </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.searchPage}>
      <div className={styles.searchBarWrapper}>
        <SearchBar initialValue={searchParams.get('name') || ''} />
      </div>
      <div>
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      {renderContent()}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${selectedCafe?.cafe.name}의 리뷰를 이어서 작성하시겠어요?`}
        subTitle="해당 카페의 임시 저장된 리뷰가 있어요."
        primaryButton={{
          text: "새로 작성하기",
          onClick: () => {
            // setIsModalOpen(false);
            if (selectedCafe) {
              handleNewDraft(selectedCafe.cafe, selectedCafe.cafeId);
            }
          },
          className: "modal-btn modal-btn-no",
        }}
        secondaryButton={{
          text: "이어서 작성하기",
          onClick: handleContinueWriting,
          className: "modal-btn modal-btn-yes",
        }}
      />
    </div>
  );
};

export default CafeSearch;
