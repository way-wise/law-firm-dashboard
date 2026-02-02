"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { resetPassword } from "@/lib/auth-client";
import {
  resetPasswordSchema,
  ResetPasswordSchemaType,
} from "@/schema/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { LuEye, LuEyeOff, LuLock } from "react-icons/lu";
import { toast } from "sonner";

const ResetPasswordForm = () => {
  const [pendingAuth, setPendingAuth] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = async (values: ResetPasswordSchemaType) => {
    const token = searchParams.get("token");

    if (!token) {
      setFormError("Invalid token! Please check your email again");
      return;
    }

    await resetPassword(
      {
        newPassword: values.password,
        token,
      },
      {
        onRequest: () => {
          setPendingAuth(true);
          setFormError("");
        },
        onSuccess: () => {
          toast.success("Password reset successful");
          router.replace("/auth/sign-in");
        },
        onError: (ctx) => {
          setFormError(ctx.error.message);
        },
      },
    );

    setPendingAuth(false);
  };

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription className="text-center">
          Enter new password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldSet>
            <FieldGroup>
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <LuLock />
                      </InputGroupAddon>
                      <InputGroupInput
                        type={showPassword ? "text" : "password"}
                        {...field}
                        id="password"
                        placeholder="Enter new password"
                      />
                      <InputGroupButton
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <LuEye /> : <LuEyeOff />}
                      </InputGroupButton>
                    </InputGroup>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <FormError message={formError} />
              <Button
                type="submit"
                className="mt-4 w-full"
                isLoading={pendingAuth}
              >
                Reset Password
              </Button>
            </FieldGroup>
          </FieldSet>
        </form>
      </CardContent>
    </Card>
  );
};

export default ResetPasswordForm;
