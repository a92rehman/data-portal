import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ChartLine, ArrowLeft, CheckCircle, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (!tokenParam) {
      toast({
        variant: "destructive",
        title: "Invalid Link",
        description: "No reset token found. Please request a new password reset link.",
      });
      navigate("/forgot-password");
    } else {
      setToken(tokenParam);
    }
  }, []);

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: z.infer<typeof resetPasswordSchema>) => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid reset token. Please request a new password reset link.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          newPassword: data.password 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to reset password");
      }

      setIsSubmitted(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not reset password. Please try again or request a new reset link.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "" };
    if (password.length < 8) return { strength: 25, label: "Weak" };
    
    let strength = 25;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 12.5;
    if (/[^A-Za-z0-9]/.test(password)) strength += 12.5;
    
    if (strength <= 25) return { strength, label: "Weak" };
    if (strength <= 50) return { strength, label: "Fair" };
    if (strength <= 75) return { strength, label: "Good" };
    return { strength, label: "Strong" };
  };

  const password = form.watch("password");
  const { strength, label } = getPasswordStrength(password);

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
            Set New Password
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {isSubmitted 
              ? "Your password has been reset successfully"
              : "Choose a strong password for your account"
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
                  Password Reset Successful!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 pt-2">
                  Redirecting to login page...
                </p>
              </div>
              <Link href="/auth">
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  data-testid="button-go-to-login"
                >
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          New Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter new password"
                              className="h-12 pr-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200"
                              disabled={isLoading}
                              data-testid="input-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        {password && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 dark:text-gray-400">Password strength:</span>
                              <span className={`font-medium ${
                                strength <= 25 ? 'text-red-500' :
                                strength <= 50 ? 'text-orange-500' :
                                strength <= 75 ? 'text-blue-500' :
                                'text-green-500'
                              }`}>
                                {label}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  strength <= 25 ? 'bg-red-500' :
                                  strength <= 50 ? 'bg-orange-500' :
                                  strength <= 75 ? 'bg-blue-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${strength}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Confirm New Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm new password"
                              className="h-12 pr-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200"
                              disabled={isLoading}
                              data-testid="input-confirm-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              data-testid="button-toggle-confirm-password"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols for a strong password.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                    disabled={isLoading}
                    data-testid="button-submit-reset"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      "Reset Password"
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
