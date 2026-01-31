"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

interface ProfileFormProps {
  user: User;
}

// Form schema
const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  currentPassword: z.string().optional().or(z.literal("")),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).refine(
  (data) => {
    // If new password is provided, current password must be provided
    if (data.newPassword && data.newPassword.length > 0) {
      return data.currentPassword && data.currentPassword.length > 0;
    }
    return true;
  },
  {
    message: "Current password is required to set a new password",
    path: ["currentPassword"],
  }
).refine(
  (data) => {
    // If new password is provided, confirm password must match
    if (data.newPassword && data.newPassword.length > 0) {
      return data.newPassword === data.confirmPassword;
    }
    return true;
  },
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm({ user }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      // Update name and email
      const updateResult = await authClient.updateUser({
        name: data.name,
        image: undefined,
      });

      if (updateResult.error) {
        toast.error(updateResult.error.message || "Failed to update profile");
        setIsSubmitting(false);
        return;
      }

      // Update password if provided
      if (data.newPassword && data.newPassword.length > 0) {
        const passwordResult = await authClient.changePassword({
          currentPassword: data.currentPassword || "",
          newPassword: data.newPassword,
          revokeOtherSessions: false,
        });

        if (passwordResult.error) {
          toast.error(passwordResult.error.message || "Failed to update password");
          setIsSubmitting(false);
          return;
        }

        // Clear password fields after successful update
        form.setValue("currentPassword", "");
        form.setValue("newPassword", "");
        form.setValue("confirmPassword", "");
      }

      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Account Information */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Account Information</h2>
          <FieldGroup>
            <Field>
              <FieldLabel>Full Name</FieldLabel>
              <Input
                placeholder="John Doe"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <FieldError>
                  {form.formState.errors.name.message}
                </FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel>Email Address</FieldLabel>
              <Input
                type="email"
                placeholder="user@example.com"
                {...form.register("email")}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed at this time
              </p>
              {form.formState.errors.email && (
                <FieldError>
                  {form.formState.errors.email.message}
                </FieldError>
              )}
            </Field>
            {user.role && (
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Input
                  value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Contact an administrator to change your role
                </p>
              </Field>
            )}
          </FieldGroup>
        </Card>

        {/* Change Password */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Change Password</h2>
          <FieldGroup>
            <Field>
              <FieldLabel>Current Password</FieldLabel>
              <Input
                type="password"
                placeholder="Enter current password"
                {...form.register("currentPassword")}
              />
              {form.formState.errors.currentPassword && (
                <FieldError>
                  {form.formState.errors.currentPassword.message}
                </FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel>New Password</FieldLabel>
              <Input
                type="password"
                placeholder="Enter new password (min 8 characters)"
                {...form.register("newPassword")}
              />
              {form.formState.errors.newPassword && (
                <FieldError>
                  {form.formState.errors.newPassword.message}
                </FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel>Confirm New Password</FieldLabel>
              <Input
                type="password"
                placeholder="Confirm new password"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <FieldError>
                  {form.formState.errors.confirmPassword.message}
                </FieldError>
              )}
            </Field>
          </FieldGroup>
          <p className="mt-4 text-sm text-muted-foreground">
            Leave password fields blank to keep your current password
          </p>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
