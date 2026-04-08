import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWallet } from "@/actions/wallet";
import { getTranslationJobs } from "@/actions/translations";
import { TranslationList } from "@/components/translations/TranslationList";
import { Coins, ArrowRight, Languages, FileText, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function TranslationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const { wallet } = await getWallet();
  const { jobs } = await getTranslationJobs();

  const balance = wallet ? Number(wallet.balance) : 0;

  const statusCounts = {
    pending: jobs.filter(j => (j as any).status === 'pending').length,
    processing: jobs.filter(j => (j as any).status === 'processing').length,
    done: jobs.filter(j => (j as any).status === 'done').length,
    failed: jobs.filter(j => (j as any).status === 'failed').length,
  };

  return (
    <div className="p-6 lg:p-8 w-full max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Plugin Translation</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Translate Minecraft plugin language files using AI
          </p>
        </div>
        <Link href="/dashboard/translations/new">
          <Button>
            <Languages className="w-4 h-4 mr-2" />
            New Translation
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Your Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold">{balance.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">credits</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{statusCounts.done}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-2xl font-bold">{statusCounts.processing}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Failed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-bold">{statusCounts.failed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Translations</CardTitle>
          <CardDescription>Your translation job history</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Languages className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No translations yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload a Minecraft plugin language file to get started
              </p>
              <Link href="/dashboard/translations/new">
                <Button>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Start Translation
                </Button>
              </Link>
            </div>
          ) : (
            <TranslationList jobs={jobs} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}