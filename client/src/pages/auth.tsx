import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ChartLine, Sparkles, Loader2, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email").refine(
    (email) => email.endsWith("@taleemabad.com") || email.endsWith("@niete.edu.pk") || email.endsWith("@niete.pk"),
    "Must use company email (@taleemabad.com, @niete.edu.pk, or @niete.pk)"
  ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  department: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [_, setLocation] = useLocation();
  const { login, signup, isLoggingIn, isSigningUp } = useAuth();
  const { toast } = useToast();
  
  const selectedRole = localStorage.getItem("selected_role") || "requester";
  const isRequester = selectedRole === "requester";

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      department: "",
    },
  });

  const handleLogin = async (data: z.infer<typeof loginSchema>) => {
    console.log("Login form submitted with data:", data);
    try {
      await login({ email: data.email, password: data.password });
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
    }
  };

  const handleSignup = async (data: z.infer<typeof signupSchema>) => {
    try {
      await signup({
        name: data.name,
        email: data.email,
        password: data.password,
        role: selectedRole,
        department: data.department,
      });
      toast({
        title: "Account created!",
        description: "You've successfully signed up. Welcome to DataHub!",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message || "Could not create account",
      });
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

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-2 border-gray-200 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 mx-auto shadow-2xl" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
            <ChartLine className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            Taleemabad DataHub
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mt-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              {selectedRole === "requester" ? "Data Requester" : selectedRole === "analyst" ? "Data Analyst" : "Data Lead"}
            </span>
            <Sparkles className="w-4 h-4" />
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white transition-all duration-200 ${
                isLogin 
                  ? 'opacity-100 shadow-md hover:shadow-lg hover:scale-105' 
                  : 'opacity-50 hover:opacity-75 hover:shadow-sm'
              }`}
              data-testid="button-switch-login"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white transition-all duration-200 ${
                !isLogin 
                  ? 'opacity-100 shadow-md hover:shadow-lg hover:scale-105' 
                  : 'opacity-50 hover:opacity-75 hover:shadow-sm'
              }`}
              data-testid="button-switch-signup"
            >
              Sign Up
            </button>
          </div>
          
          {!isLogin && !isRequester && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> {selectedRole === "analyst" ? "Data Analysts" : "Data Leads"} cannot self-register. Please use Login if you've been invited, or contact your Data Lead.
              </p>
            </div>
          )}

          {isLogin ? (
            <Form {...loginForm}>
              <form 
                key="login-form" 
                onSubmit={loginForm.handleSubmit(
                  handleLogin,
                  (errors) => console.log("Login form validation errors:", errors)
                )} 
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          type="email"
                          placeholder="you@taleemabad.com"
                          autoComplete="email"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            data-testid="input-password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoggingIn}
                  onClick={(e) => {
                    console.log("Login button clicked!");
                    console.log("Form values:", loginForm.getValues());
                    console.log("Form errors:", loginForm.formState.errors);
                  }}
                  data-testid="button-submit-login"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...signupForm}>
              <form key="signup-form" onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <FormField
                  control={signupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          placeholder="John Doe"
                          autoComplete="name"
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Email</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          type="email"
                          placeholder="you@taleemabad.com"
                          autoComplete="email"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-department">
                            <SelectValue placeholder="Select your department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Product">Product</SelectItem>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            data-testid="input-password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            data-testid="input-confirm-password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSigningUp || !isRequester}
                  data-testid="button-submit-signup"
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : !isRequester ? (
                    "Sign Up Not Available"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              ← Back to role selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
