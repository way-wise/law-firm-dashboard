import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  LuTriangleAlert,
  LuBell,
  LuBriefcase,
  LuCalendarClock,
  LuCircleCheck,
  LuCreditCard,
  LuFileText,
  LuListTodo,
  LuUserPlus,
  LuX,
} from "react-icons/lu";

interface NotificationProps {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
  readAt: string | null;
}

const getNotificationStyle = (type: string) => {
  switch (type) {
    case "MATTER":
      return {
        border: "border-emerald-500",
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-500",
        icon: LuBriefcase,
      };
    case "RFE":
      return {
        border: "border-red-500",
        iconBg: "bg-red-500/10",
        iconColor: "text-red-500",
        icon: LuTriangleAlert,
      };
    case "CLIENT":
      return {
        border: "border-blue-500",
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-500",
        icon: LuUserPlus,
      };
    case "CASE_UPDATE":
      return {
        border: "border-emerald-500",
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-500",
        icon: LuCircleCheck,
      };
    case "DOCUMENT":
      return {
        border: "border-violet-500",
        iconBg: "bg-violet-500/10",
        iconColor: "text-violet-500",
        icon: LuFileText,
      };
    case "PAYMENT":
      return {
        border: "border-green-500",
        iconBg: "bg-green-500/10",
        iconColor: "text-green-500",
        icon: LuCreditCard,
      };
    case "DEADLINE":
      return {
        border: "border-orange-500",
        iconBg: "bg-orange-500/10",
        iconColor: "text-orange-500",
        icon: LuCalendarClock,
      };
    case "TASK":
      return {
        border: "border-cyan-500",
        iconBg: "bg-cyan-500/10",
        iconColor: "text-cyan-500",
        icon: LuListTodo,
      };
    case "REMINDER":
      return {
        border: "border-amber-500",
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-500",
        icon: LuCalendarClock,
      };
    default:
      return {
        border: "border-primary",
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        icon: LuBell,
      };
  }
};

const NotificationCard = ({
  type,
  title,
  message,
  time,
  readAt,
}: NotificationProps) => {
  const { border, iconBg, iconColor, icon: Icon } = getNotificationStyle(type);

  return (
    <div className="flex items-center justify-between hover:bg-accent/30">
      <div
        className={cn(
          "flex w-full gap-4 border-l-[3px] border-transparent p-4",
          !readAt && border,
        )}
      >
        <div
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-md p-2",
            !readAt ? iconBg : "bg-accent",
          )}
        >
          <Icon
            className={cn(
              "icon",
              !readAt ? iconColor : "text-muted-foreground",
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <p
              className={cn(
                "text-sm",
                !readAt ? "font-semibold" : "font-medium text-muted-foreground",
              )}
            >
              {title}
            </p>
            <button
              aria-label="Dismiss notification"
              type="button"
              className="inline-flex size-6 items-center justify-center opacity-70 hover:opacity-100"
            >
              <LuX className="size-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex items-end justify-between text-sm">
            <p className="text-muted-foreground">{time}</p>
            <Link href="#" className="text-primary hover:underline">
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;
