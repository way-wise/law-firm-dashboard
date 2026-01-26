"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
    className?: string
    value?: DateRange
    onChange?: (range: DateRange | undefined) => void
    placeholder?: string
    align?: "start" | "center" | "end"
    disabled?: boolean
}

export function DateRangePicker({
    className,
    value,
    onChange,
    placeholder = "Select date range",
    align = "end",
    disabled = false,
}: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false)
    const hasValue = value?.from || value?.to

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onChange?.(undefined)
        setOpen(false)
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "h-10 w-full max-w-sm justify-start text-left",
                            !hasValue && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="h-4 w-4" />
                        <span className="flex-1">
                            {value?.from ? (
                                value.to ? (
                                    <>
                                        {format(value.from, "LLL dd, y")} -{" "}
                                        {format(value.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(value.from, "LLL dd, y")
                                )
                            ) : (
                                placeholder
                            )}
                        </span>
                        {hasValue && (
                            <span
                                role="button"
                                tabIndex={0}
                                className="inline-flex items-center justify-center rounded-sm hover:bg-accent"
                                onClick={handleClear}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleClear(e as unknown as React.MouseEvent)
                                    }
                                }}
                            >
                                <X className="h-4 w-4 opacity-50 hover:opacity-100" />
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align={align}>
                    <Calendar
                        mode="range"
                        defaultMonth={value?.from}
                        selected={value}
                        onSelect={onChange}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}