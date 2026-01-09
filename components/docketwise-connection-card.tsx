import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Plug } from "lucide-react";
import Link from "next/link";

interface DocketwiseConnectionCardProps {
  title?: string;
  description: string;
}

export function DocketwiseConnectionCard({
  title = "Docketwise Not Connected",
  description,
}: DocketwiseConnectionCardProps) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border bg-muted">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/settings?tab=integrations">
            <Plug />
            Go to Settings to Connect
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
