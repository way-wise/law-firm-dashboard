"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import * as React from "react";
import { LuChevronDown, LuX } from "react-icons/lu";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value?: Option[];
  onChange?: (value: Option[]) => void;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select options...",
  className,
  isDisabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (option: Option) => {
    const isSelected = value.some((v) => v.value === option.value);
    const newValue = isSelected
      ? value.filter((v) => v.value !== option.value)
      : [...value, option];
    onChange?.(newValue);
  };

  const handleRemove = (
    option: Option,
    e: React.MouseEvent | React.KeyboardEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.(value.filter((v) => v.value !== option.value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isDisabled}
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border-2 border-input bg-background px-3 py-2 text-sm transition-colors hover:border-input focus-visible:border-primary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {value.length > 0 ? (
              value.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="gap-2 rounded pr-1.5 pl-2"
                >
                  {option.label}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleRemove(option, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleRemove(option, e);
                      }
                    }}
                    className="cursor-pointer rounded bg-zinc-300 p-0.5 transition-colors hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                  >
                    <LuX className="size-4" />
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <LuChevronDown className="size-5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value.some((v) => v.value === option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option)}
                    className="cursor-pointer"
                  >
                    <Checkbox checked={isSelected} className="mr-2" />
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}