import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuCollapsibleItemProps = {
  title: string;
  url: string;
};

const MenuCollapsibleItem = ({ title, url }: MenuCollapsibleItemProps) => {
  const pathName = usePathname();
  const active = pathName === url;

  return (
    <Link
      href={{ pathname: url }}
      className="relative flex items-center transition-colors before:h-px before:w-[1.6rem] before:bg-border before:transition-colors before:content-[''] focus-visible:outline-hidden"
    >
      <span
        className={cn("w-full rounded-md px-2.5 py-1.5 text-[15px]", {
          "bg-secondary": active,
          "text-secondary-foreground/70 hover:bg-secondary in-focus-visible:bg-secondary":
            !active,
        })}
      >
        {title}
      </span>
    </Link>
  );
};

export default MenuCollapsibleItem;
