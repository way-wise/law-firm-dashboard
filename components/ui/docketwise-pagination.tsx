"use client";

import { useRouter } from "@bprogress/next";
import { useSearchParams } from "next/navigation";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { Button } from "./button";

interface DocketwisePaginationProps {
  pagination: {
    total: number;
    next_page: number | null;
    previous_page: number | null;
    total_pages: number;
  };
}

export const DocketwisePagination = ({ pagination }: DocketwisePaginationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;

  const { total, next_page, previous_page, total_pages } = pagination;

  if (total_pages <= 1) return null;

  const firstItem = (currentPage - 1) * 200 + 1;
  const lastItem = Math.min(total, currentPage * 200);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-6 pt-6 sm:flex-row">
      <div className="text-sm">
        {`Showing ${firstItem} - ${lastItem} of ${total}`}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {total_pages}
        </span>

        <Button
          variant="outline"
          size="icon-lg"
          onClick={() => previous_page && handlePageChange(previous_page)}
          disabled={!previous_page}
          aria-label="Previous page"
        >
          <LuChevronLeft />
        </Button>

        <Button
          variant="outline"
          size="icon-lg"
          onClick={() => next_page && handlePageChange(next_page)}
          disabled={!next_page}
          aria-label="Next page"
        >
          <LuChevronRight />
        </Button>
      </div>
    </div>
  );
};
