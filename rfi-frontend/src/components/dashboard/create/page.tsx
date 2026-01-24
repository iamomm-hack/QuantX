"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Check, Loader2, Info } from "lucide-react";
// Ensure this hook exists in your project or mock it if testing in isolation
import { useWallet } from "@/context/wallet-provider";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// --- Mock Contract Utils ---
const MOCK_TOKEN_ADDRESS = "CAS3...TOKEN";
const PAYMENT_CONTRACT_ADDRESS = "CDX9...PAYMENT";

const checkAllowance = async (user: string, token: string, spender: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log(`Checking allowance for ${token}...`);
  return 0;
};

const approveToken = async (amount: number) => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log(`Approved ${amount}`);
  return true;
};

const createSubscriptionOnChain = async (data: any) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("Subscription created:", data);
  return true;
};

// --- Schema ---
const formSchema = z.object({
  recipient: z
    .string()
    .length(56, "Stellar addresses must be 56 characters")
    .startsWith("G", "Stellar public keys must start with 'G'"),
  token: z.enum(["USDC", "XLM"]),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .min(0.0000001, "Amount too small"),
  interval: z.string().min(1, "Please select an interval"),
  // FIXED 1: Removed { required_error } to fix "unknown property" error
  startDate: z.date(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateSubscriptionPage() {
  const { address, isConnected } = useWallet();
  const [allowance, setAllowance] = useState<number>(0);
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FIXED 2: Explicitly typed useForm to prevent 'Control' mismatch errors
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "",
      token: "USDC",
      amount: 0,
      interval: "2592000", // Default to Monthly
      startDate: new Date(),
    },
  });

  // Watch values
  const watchedAmount = form.watch("amount");
  const watchedToken = form.watch("token");

  // --- 1. Allowance Check Effect ---
  useEffect(() => {
    // Reset allowance if wallet disconnects or address is missing
    if (!isConnected || !address) {
      setAllowance(0);
      return;
    }

    // Don't check allowance if amount is 0 or invalid
    if (!watchedAmount || watchedAmount <= 0) return;

    // Don't check allowance for Native XLM
    if (watchedToken === "XLM") {
      setAllowance(Number.MAX_SAFE_INTEGER); // Mock infinite allowance for native
      return;
    }

    let isMounted = true;

    const fetchAllowance = async () => {
      setIsCheckingAllowance(true);
      try {
        const val = await checkAllowance(
          address,
          watchedToken,
          PAYMENT_CONTRACT_ADDRESS,
        );
        if (isMounted) setAllowance(val);
      } catch (error) {
        console.error("Failed to check allowance", error);
      } finally {
        if (isMounted) setIsCheckingAllowance(false);
      }
    };

    const timeoutId = setTimeout(fetchAllowance, 800);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [watchedAmount, watchedToken, address, isConnected]);

  // --- 2. Handlers ---
  const handleApprove = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    if (!address) return;

    setIsApproving(true);
    try {
      await approveToken(watchedAmount);
      setAllowance(watchedAmount); // Optimistically update allowance
    } catch (error) {
      console.error("Approval failed", error);
    } finally {
      setIsApproving(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    setIsSubmitting(true);
    try {
      await createSubscriptionOnChain(values);
      alert("Subscription Created Successfully!");

      form.reset({
        recipient: "",
        token: "USDC",
        amount: 0,
        interval: "2592000",
        startDate: new Date(),
      });
    } catch (error) {
      console.error("Creation failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if we need approval
  const isNativeToken = watchedToken === "XLM";
  const needsApproval =
    !isNativeToken && watchedAmount > 0 && allowance < watchedAmount;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-slate-900">
            Create Subscription
          </CardTitle>
          <CardDescription>
            Set up a recurring payment on the Stellar network.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Field */}
              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="G..."
                        className="font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The Stellar public key receiving the funds.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Token Select */}
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USDC">USDC (Circle)</SelectItem>
                          <SelectItem value="XLM">XLM (Native)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount Input */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0000001"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => {
                            const val =
                              e.target.value === ""
                                ? 0
                                : parseFloat(e.target.value);
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Interval Select */}
                <FormField
                  control={form.control}
                  name="interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="86400">Daily</SelectItem>
                          <SelectItem value="604800">Weekly</SelectItem>
                          <SelectItem value="2592000">
                            Monthly (~30 Days)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Picker */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col mt-2">
                      <FormLabel className="mb-1">Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Info Box - Only show if approval is needed */}
              {needsApproval && (
                <div className="rounded-md bg-slate-50 p-4 border border-slate-100 flex items-start gap-3">
                  <Info className="h-5 w-5 text-indigo-500 mt-0.5" />
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-900">
                      Allowance Required
                    </p>
                    You must approve the Payment Contract to spend{" "}
                    {watchedToken} on your behalf before creating the
                    subscription.
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          {needsApproval ? (
            <Button
              onClick={handleApprove}
              disabled={isApproving || isCheckingAllowance}
              className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]"
              type="button" // Explicitly prevent form submission
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                `Approve ${watchedToken}`
              )}
            </Button>
          ) : (
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting || needsApproval || !isConnected}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Create Subscription
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
