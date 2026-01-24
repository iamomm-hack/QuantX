import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react"; // install lucide-react if needed
import Link from "next/link";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash?: string;
}

export default function SuccessModal({
  isOpen,
  onClose,
  txHash = "0x123...abc",
}: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Payment Stream Created!
          </DialogTitle>
          <DialogDescription className="text-center">
            Your recurring payment is now active on the blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="bg-slate-100 p-3 rounded-lg text-center font-mono text-sm text-slate-600 break-all">
            Tx: {txHash}
          </div>

          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="w-full">
              <Button className="w-full" onClick={onClose}>
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
