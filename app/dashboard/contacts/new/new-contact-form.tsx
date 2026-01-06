"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContactType } from "@/data/clients";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const personContactSchema = z.object({
  lead: z.string(),
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  street_address: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
});

const institutionContactSchema = z.object({
  lead: z.string(),
  company_name: z.string().min(1, "Company name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  street_address: z.string().optional(),
  suite: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
});

type PersonContactInput = z.infer<typeof personContactSchema>;
type InstitutionContactInput = z.infer<typeof institutionContactSchema>;

const NewContactForm = () => {
  const router = useRouter();
  const [contactType, setContactType] = useState<ContactType>("Person");

  const personForm = useForm<PersonContactInput>({
    resolver: zodResolver(personContactSchema),
    defaultValues: {
      lead: "false",
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
      phone: "",
      street_address: "",
      apartment: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
    },
  });

  const institutionForm = useForm<InstitutionContactInput>({
    resolver: zodResolver(institutionContactSchema),
    defaultValues: {
      lead: "false",
      company_name: "",
      email: "",
      phone: "",
      street_address: "",
      suite: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
    },
  });

  const onPersonSubmit = async (data: PersonContactInput) => {
    console.log("Person contact:", data);
    // TODO: API call
  };

  const onInstitutionSubmit = async (data: InstitutionContactInput) => {
    console.log("Institution contact:", data);
    // TODO: API call
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Add New Contact</h1>
          <p className="text-sm text-muted-foreground">Create a new contact in Docketwise</p>
        </div>
      </div>

      {/* Tabs outside card */}
      <Tabs value={contactType} onValueChange={(v) => setContactType(v as ContactType)} className="w-full">
        <TabsList>
          <TabsTrigger value="Person">
            <User />
            Person
          </TabsTrigger>
          <TabsTrigger value="Institution">
            <Building2 />
            Institution
          </TabsTrigger>
        </TabsList>

        {/* Form Card */}
        <div className="rounded-xl border bg-card p-6">
          {/* Person Form */}
          <TabsContent value="Person" className="m-0">
            <form onSubmit={personForm.handleSubmit(onPersonSubmit)} autoComplete="off">
              <FieldSet disabled={personForm.formState.isSubmitting}>
                <FieldGroup>
                  {/* Lead Status */}
                  <Controller
                    name="lead"
                    control={personForm.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="lead">Lead Status</FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">Client</SelectItem>
                            <SelectItem value="true">Lead</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  {/* Name Fields */}
                  <FieldGroup className="grid sm:grid-cols-3">
                    <Controller
                      name="first_name"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="first_name">
                            First Name <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input {...field} id="first_name" placeholder="John" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="middle_name"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="middle_name">Middle Name</FieldLabel>
                          <Input {...field} id="middle_name" placeholder="William" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="last_name"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="last_name">
                            Last Name <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input {...field} id="last_name" placeholder="Doe" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  {/* Contact Info */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="email"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="email">Email</FieldLabel>
                          <Input {...field} id="email" type="email" placeholder="john@example.com" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="phone"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="phone">Phone (Daytime)</FieldLabel>
                          <Input {...field} id="phone" placeholder="+1 (555) 123-4567" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  {/* Address */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="street_address"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="street_address">Street Address</FieldLabel>
                          <Input {...field} id="street_address" placeholder="123 Main Street" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="apartment"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="apartment">Apartment/Unit</FieldLabel>
                          <Input {...field} id="apartment" placeholder="Apt 4B" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="city"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="city">City</FieldLabel>
                          <Input {...field} id="city" placeholder="Los Angeles" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="state"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="state">State/Province</FieldLabel>
                          <Input {...field} id="state" placeholder="CA" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="zip_code"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="zip_code">ZIP Code</FieldLabel>
                          <Input {...field} id="zip_code" placeholder="90001" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="country"
                      control={personForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="country">Country</FieldLabel>
                          <Input {...field} id="country" placeholder="USA" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldGroup>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/contacts">Cancel</Link>
                  </Button>
                  <Button type="submit" isLoading={personForm.formState.isSubmitting}>
                    Add Contact
                  </Button>
                </div>
              </FieldSet>
            </form>
          </TabsContent>

          {/* Institution Form */}
          <TabsContent value="Institution" className="m-0">
            <form onSubmit={institutionForm.handleSubmit(onInstitutionSubmit)} autoComplete="off">
              <FieldSet disabled={institutionForm.formState.isSubmitting}>
                <FieldGroup>
                  {/* Lead Status */}
                  <Controller
                    name="lead"
                    control={institutionForm.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="inst_lead">Lead Status</FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">Client</SelectItem>
                            <SelectItem value="true">Lead</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  {/* Company Name */}
                  <Controller
                    name="company_name"
                    control={institutionForm.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="company_name">
                          Company Name <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input {...field} id="company_name" placeholder="Acme Corporation" />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  {/* Contact Info */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="email"
                      control={institutionForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="inst_email">Email</FieldLabel>
                          <Input {...field} id="inst_email" type="email" placeholder="contact@company.com" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="phone"
                      control={institutionForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="inst_phone">Phone</FieldLabel>
                          <Input {...field} id="inst_phone" placeholder="+1 (555) 123-4567" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  {/* Address */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="street_address"
                      control={institutionForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="inst_street">Street Address</FieldLabel>
                          <Input {...field} id="inst_street" placeholder="500 Business Park" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="suite"
                      control={institutionForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="suite">Suite/Floor</FieldLabel>
                          <Input {...field} id="suite" placeholder="Suite 200" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="city"
                      control={institutionForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="inst_city">City</FieldLabel>
                          <Input {...field} id="inst_city" placeholder="San Francisco" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="state"
                      control={institutionForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="inst_state">State/Province</FieldLabel>
                          <Input {...field} id="inst_state" placeholder="CA" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="zip_code"
                      control={institutionForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="inst_zip">ZIP Code</FieldLabel>
                          <Input {...field} id="inst_zip" placeholder="94102" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="country"
                      control={institutionForm.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="inst_country">Country</FieldLabel>
                          <Input {...field} id="inst_country" placeholder="USA" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldGroup>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/contacts">Cancel</Link>
                  </Button>
                  <Button type="submit" isLoading={institutionForm.formState.isSubmitting}>
                    Add Contact
                  </Button>
                </div>
              </FieldSet>
            </form>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default NewContactForm;
