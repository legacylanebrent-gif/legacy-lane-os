import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function CustomerIOEmailTest() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("EstateSalen Customer.io Test Email");
  const [body, setBody] = useState(
    "<p>This is a test email sent via the Customer.io transactional send API.</p>"
  );
  const [from, setFrom] = useState("");
  const [messageId, setMessageId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!to) { setError("Enter a recipient email address."); return; }
    setLoading(true); setError(null); setSuccess(false); setMessageId(null);
    try {
      const res = await base44.functions.invoke("customerioService", {
        action: "sendTestEmail",
        to: to.trim(),
        from: from.trim() || undefined,
        subject,
        body,
      });
      setSuccess(true);
      setMessageId(res.data?.messageId || null);
    } catch (e) {
      const data = e.response?.data;
      setError(data?.error || e.message || "Failed to send test email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer.io Email Test</h1>
          <p className="text-slate-500 mt-1">
            Send a test email to any address using the Customer.io transactional send API.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
            <CardDescription>
              The email goes out through Customer.io directly. Check the recipient's inbox (and spam folder) to verify deliverability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="to">To (recipient email) *</Label>
              <Input
                id="to"
                type="email"
                placeholder="you@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from">From (optional)</Label>
              <Input
                id="from"
                placeholder="Defaults to app's configured sender"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Body (HTML)</Label>
              <Textarea
                id="body"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Test email accepted by Customer.io. It should arrive shortly.
                  {messageId ? ` Message ID: ${messageId}` : ""}
                </span>
              </div>
            )}

            <Button onClick={handleSend} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Test Email</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>• If no From address is set, Customer.io uses your workspace's default sender.</p>
            <p>• Every send is logged in the Marketing Event Log as "admin.send_test_email".</p>
            <p>• To test the full automated lifecycle, send to an address you control and watch for Customer.io reporting webhooks in the event log.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}