import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChartLine, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import emailjs from '@emailjs/browser';

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
    setIsLoading(true);
    try {
      // Call backend to generate reset token
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send reset link");
      }

      // If emailData is returned, send email via EmailJS
      if (result.emailData) {
        const { userName, userEmail, resetUrl } = result.emailData;
        
        // Send email using EmailJS with template_1hb8p6b
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
          'template_1hb8p6b', // Password reset template ID
          {
            to_name: userName,
            to_email: userEmail,
            reset_link: resetUrl,
            from_name: 'DataHub Team',
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''
        );

        console.log('[forgot-password] Reset email sent via EmailJS to:', userEmail);
      }

      setIsSubmitted(true);
    } catch (error: any) {
      console.error('[forgot-password] Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not send reset link. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950 dark:via-blue-950 dark:to-pink-950"></div>
      
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-2 border-gray-200 bg-white/90 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 mx-auto shadow-2xl" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
            <ChartLine className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            Reset Password
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {isSubmitted 
              ? "Check your email for reset instructions"
              : "Enter your email to receive a password reset link"
            }
          </p>
        </CardHeader>

        <CardContent>
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Reset Link Sent!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  If an account exists with the email <span className="font-medium text-gray-900 dark:text-white">{form.getValues("email")}</span>, you will receive a password reset link shortly.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 pt-2">
                  The link will expire in 1 hour for security reasons.
                </p>
              </div>
              <Link href="/auth">
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="your.email@taleemabad.com"
                            className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200"
                            disabled={isLoading}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                    disabled={isLoading}
                    data-testid="button-submit-reset"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Reset Link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <Link href="/auth">
                  <button 
                    className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium inline-flex items-center gap-1 transition-colors duration-200"
                    data-testid="link-back-to-login"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to Login
                  </button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
