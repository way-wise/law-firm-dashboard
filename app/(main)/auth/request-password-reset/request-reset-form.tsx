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
  InputGroupInput,
} from "@/components/ui/input-group";
import { requestPasswordReset } from "@/lib/auth-client";
import {
  requestPasswordResetSchema,
  RequestPasswordResetSchemaType,
} from "@/schema/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { LuMail } from "react-icons/lu";

const RequestPasswordResetForm = () => {
  const [pendingAuth, setPendingAuth] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  const form = useForm({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  // On Submit
  const onSubmit = async (values: RequestPasswordResetSchemaType) => {
    await requestPasswordReset(
      {
        email: values.email,
        redirectTo: "/auth/reset-password",
      },
      {
        onRequest: () => {
          setPendingAuth(true);
          setFormError("");
        },
        onError: (ctx) => {
          setFormError(ctx.error.message);
        },
        onSuccess: (data) => {
          if (data?.data.status) {
            setFormError(
              "If this email exists in our system, check your email for the reset link",
            );
          }
        },
      },
    );

    setPendingAuth(false);
  };

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="text-2xl">Request Password Reset</CardTitle>
        <CardDescription className="text-center">
          Enter your account email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldSet>
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <LuMail />
                      </InputGroupAddon>
                      <InputGroupInput
                        autoComplete="email"
                        {...field}
                        id="email"
                        placeholder="john@example.com"
                      />
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
                Send Reset Password Link
              </Button>
            </FieldGroup>
          </FieldSet>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-1 text-center text-sm">
          <span className="text-muted-foreground">Remember password?</span>
          <Link
            href="/auth/sign-in"
            className="text-muted-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-hidden"
          >
            Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestPasswordResetForm;
