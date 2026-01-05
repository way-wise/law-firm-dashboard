"use client";

import { MetaData } from "@/types";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface PaginationProps {
  meta: MetaData;
  onPageChange: (page: string) => void;
  onLimitChange: (limit: string) => void;
}

export const Pagination = ({
  meta,
  onPageChange,
  onLimitChange,
}: PaginationProps) => {
  const { page, limit, total } = meta;

  // Hide pagination if 10 or fewer items
  if (total <= 10) return null;

  // Calculate total pages
  const totalPages = Math.ceil(total / limit) || 1;

  // Disable prev/next at edges
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  // Calculate displayed item range
  const firstItem = (page - 1) * limit + 1;
  const lastItem = Math.min(total, page * limit);

  // Handle previous button
  const handlePrev = () => {
    if (!prevDisabled) onPageChange(String(page - 1));
  };

  // Handle next button
  const handleNext = () => {
    if (!nextDisabled) onPageChange(String(page + 1));
  };

  // Handle limit change
  const handleLimitChange = (value: string) => {
    onPageChange("1");
    onLimitChange(value);
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-6 pt-6 sm:flex-row">
      {/* Pagination info */}
      <div className="flex items-center gap-3 text-sm">
        <div>{`Showing ${firstItem} - ${lastItem} of ${total}`}</div>
      </div>

      {/* Pagination buttons & Limit selector */}
      <div className="flex items-center gap-3">
        <Select
          value={limit.toString()}
          onValueChange={(value) => handleLimitChange(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Items per page" />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / Page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon-lg"
          onClick={handlePrev}
          disabled={prevDisabled}
          aria-label="Previous page"
        >
          <LuChevronLeft />
        </Button>

        <Button
          variant="outline"
          size="icon-lg"
          onClick={handleNext}
          disabled={nextDisabled}
          aria-label="Next page"
        >
          <LuChevronRight />
        </Button>
      </div>
    </div>
  );
};
