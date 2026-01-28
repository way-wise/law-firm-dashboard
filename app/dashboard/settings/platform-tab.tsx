"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/ui/file-upload";
import { 
  Settings, 
  Globe, 
  Search, 
  Image as ImageIcon,
  Trash2,
  Save,
  Eye,
  EyeOff
} from "lucide-react";
import Image from "next/image";

interface PlatformSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  favicon: File | null;
  logo: File | null;
  ogImage: File | null;
  metaTitle: string;
  metaDescription: string;
  enableSEO: boolean;
  enableAnalytics: boolean;
  googleAnalyticsId: string;
  customMetaTags: string;
}

export function PlatformTab() {
  const [settings, setSettings] = useState<PlatformSettings>({
    siteName: "Law Firm Dashboard",
    siteDescription: "Professional immigration law firm management system",
    siteUrl: "https://your-law-firm.com",
    favicon: null,
    logo: null,
    ogImage: null,
    metaTitle: "Law Firm Dashboard - Immigration Case Management",
    metaDescription: "Comprehensive immigration law firm management system with case tracking, deadline management, and client communication tools.",
    enableSEO: true,
    enableAnalytics: false,
    googleAnalyticsId: "",
    customMetaTags: "",
  });

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (field: keyof PlatformSettings, files: File[]) => {
    const file = files[0] || null;
    setSettings(prev => ({ ...prev, [field]: file }));

    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [field]: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    } else if (!file) {
      setPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[field];
        return newPreviews;
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Settings saved:", settings);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      siteName: "Law Firm Dashboard",
      siteDescription: "Professional immigration law firm management system",
      siteUrl: "https://your-law-firm.com",
      favicon: null,
      logo: null,
      ogImage: null,
      metaTitle: "Law Firm Dashboard - Immigration Case Management",
      metaDescription: "Comprehensive immigration law firm management system with case tracking, deadline management, and client communication tools.",
      enableSEO: true,
      enableAnalytics: false,
      googleAnalyticsId: "",
      customMetaTags: "",
    });
    setPreviews({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Platform Settings</h2>
          <p className="text-muted-foreground">
            Configure your platform&apos;s appearance, SEO settings, and branding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <Trash2 className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Settings */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <h3 className="text-lg font-medium">Basic Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                  placeholder="Enter your site name"
                />
              </div>

              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) => setSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                  placeholder="Brief description of your platform"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  value={settings.siteUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, siteUrl: e.target.value }))}
                  placeholder="https://your-domain.com"
                  type="url"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Branding */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              <h3 className="text-lg font-medium">Branding</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Logo</Label>
                <FileUpload
                  value={settings.logo ? [settings.logo] : []}
                  onValueChange={(files) => handleFileChange('logo', files)}
                  accept="image/*"
                  maxFiles={1}
                  className="mt-2"
                />
                {previews.logo && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <Image
                      src={previews.logo}
                      alt="Logo preview"
                      width={100}
                      height={100}
                      className="h-16 w-auto rounded border"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Favicon</Label>
                <FileUpload
                  value={settings.favicon ? [settings.favicon] : []}
                  onValueChange={(files) => handleFileChange('favicon', files)}
                  accept=".ico,.png"
                  maxFiles={1}
                  maxSize={1024 * 1024} // 1MB
                  className="mt-2"
                />
                {previews.favicon && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <Image
                      src={previews.favicon}
                      alt="Favicon preview"
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded border"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>OG Image (Social Media)</Label>
                <FileUpload
                  value={settings.ogImage ? [settings.ogImage] : []}
                  onValueChange={(files) => handleFileChange('ogImage', files)}
                  accept="image/*"
                  maxFiles={1}
                  className="mt-2"
                />
                {previews.ogImage && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <Image
                      src={previews.ogImage}
                      alt="OG image preview"
                      width={300}
                      height={157}
                      className="w-full max-w-[300px] rounded border"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* SEO Settings */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <h3 className="text-lg font-medium">SEO Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable SEO</Label>
                  <p className="text-sm text-muted-foreground">
                    Optimize pages for search engines
                  </p>
                </div>
                <Switch
                  checked={settings.enableSEO}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSEO: checked }))}
                />
              </div>

              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={settings.metaTitle}
                  onChange={(e) => setSettings(prev => ({ ...prev, metaTitle: e.target.value }))}
                  placeholder="SEO title for homepage"
                  disabled={!settings.enableSEO}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: 50-60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={settings.metaDescription}
                  onChange={(e) => setSettings(prev => ({ ...prev, metaDescription: e.target.value }))}
                  placeholder="SEO description for homepage"
                  rows={3}
                  disabled={!settings.enableSEO}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: 150-160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="customMetaTags">Custom Meta Tags</Label>
                <Textarea
                  id="customMetaTags"
                  value={settings.customMetaTags}
                  onChange={(e) => setSettings(prev => ({ ...prev, customMetaTags: e.target.value }))}
                  placeholder="&lt;meta name=&amp;quot;author&amp;quot; content=&amp;quot;Your Name&amp;quot;&gt;"
                  rows={4}
                  disabled={!settings.enableSEO}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add custom meta tags (one per line)
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Analytics */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <h3 className="text-lg font-medium">Analytics</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Track website usage and performance
                  </p>
                </div>
                <Switch
                  checked={settings.enableAnalytics}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableAnalytics: checked }))}
                />
              </div>

              <div>
                <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                <Input
                  id="googleAnalyticsId"
                  value={settings.googleAnalyticsId}
                  onChange={(e) => setSettings(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
                  placeholder="G-XXXXXXXXXX"
                  disabled={!settings.enableAnalytics}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your Google Analytics 4 measurement ID
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">SEO Preview</h3>
            <Separator />
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Google Search Result:</p>
                <div className="border rounded-lg p-4 bg-background">
                  <div className="space-y-2">
                    <div className="text-xl text-blue-800 hover:underline cursor-pointer">
                      {settings.metaTitle || settings.siteName}
                    </div>
                    <div className="text-green-700 text-sm">
                      {settings.siteUrl}
                    </div>
                    <div className="text-sm text-gray-600">
                      {settings.metaDescription}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Social Media Preview:</p>
                <div className="border rounded-lg overflow-hidden bg-white">
                  {previews.ogImage ? (
                    <Image
                      src={previews.ogImage}
                      alt="OG preview"
                      width={500}
                      height={262}
                      className="w-full"
                    />
                  ) : (
                    <div className="h-32 bg-gray-200 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="font-semibold text-lg">
                      {settings.metaTitle || settings.siteName}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {settings.siteUrl}
                    </div>
                    <div className="text-sm text-gray-700 mt-2">
                      {settings.metaDescription}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
