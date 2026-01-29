"use client";

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
import { LuCheck, LuChevronDown, LuX } from "react-icons/lu";

export interface AdvancedSelectOption {
  value: string;
  label: string;
  description?: string;
  customRender?: React.ReactNode;
}

interface AdvancedSelectProps {
  options: AdvancedSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  emptyMessage?: string;
  isLoading?: boolean;
  isClearable?: boolean;
  filterOption?: (option: AdvancedSelectOption, inputValue: string) => boolean;
}

export function AdvancedSelect({
  options,
  value,
  onChange,
  onInputChange,
  placeholder = "Select option",
  className,
  disabled = false,
  emptyMessage = "No options found.",
  isLoading = false,
  isClearable = false,
  filterOption,
}: AdvancedSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (selectedValue: string) => {
    onChange?.(selectedValue === value ? "" : selectedValue);
    setOpen(false);
    setInputValue("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.("");
    setInputValue("");
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onInputChange?.(newValue);
  };

  // Filter options based on filterOption prop or default behavior
  const filteredOptions = filterOption
    ? options.filter((option) => filterOption(option, inputValue))
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border-2 border-input bg-background px-3 py-2 text-sm transition-colors hover:border-input focus-visible:border-primary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span
            className={cn(
              "truncate flex-1 text-left",
              !selectedOption && "text-muted-foreground",
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {isClearable && selectedOption && (
              <LuX 
                className="size-4 opacity-50 hover:opacity-100 cursor-pointer" 
                onClick={handleClear}
              />
            )}
            <LuChevronDown className="size-5 opacity-50" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={!filterOption}>
          <CommandInput
            placeholder="Search..."
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {filteredOptions.map((option) => {
                    const isSelected = value === option.value;
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => handleSelect(option.value)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between",
                          isSelected && "bg-accent"
                        )}
                      >
                        {option.customRender ? (
                          <div className="flex-1">{option.customRender}</div>
                        ) : (
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            )}
                          </div>
                        )}
                        {isSelected && <LuCheck className="size-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
