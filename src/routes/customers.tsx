import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
import type { Customer } from "@/lib/robotics-types";
import {
  Users,
  Search,
  Phone,
  MapPin,
  FolderKanban,
  CheckCircle2,
  Clock,
  TrendingUp,
  Coins,
  ChevronRight,
  Building2,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/customers")({
  component: CustomersComponent,
});

function CustomersComponent() {
  const { customers, projects, enquiries, payments } = useRobotics();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Master</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Auto-Aggregated
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Unified client database built automatically from enquiries and project contracts.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Customer Name, Phone, Location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs rounded-lg h-9"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-card rounded-xl border border-border">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                <Users className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">No customer records found.</p>
                <p className="text-xs text-muted-foreground">Customers are auto-registered when creating enquiries and project bookings.</p>
              </div>
            </div>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const custProjects = projects.filter(
              (p) => p.customerName.toLowerCase().trim() === cust.name.toLowerCase().trim()
            );
            const completedCount = custProjects.filter((p) => p.status === "Completed" || p.status === "Closed").length;
            const ongoingCount = custProjects.filter((p) => p.status === "Ongoing").length;

            const totalCustRevenue = custProjects.reduce((s, p) => s + p.projectValue, 0);
            const totalCustCollected = custProjects.reduce((s, p) => s + p.receivedAmount, 0);
            const totalCustPending = Math.max(0, totalCustRevenue - totalCustCollected);

            const custPayments = payments.filter((pay) =>
              custProjects.some((p) => p.id === pay.projectId)
            );

            return (
              <Card
                key={cust.id}
                onClick={() => setSelectedCustomer(cust)}
                className="rounded-xl border border-border shadow-xs hover:shadow-md transition-all cursor-pointer bg-white dark:bg-card flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">{cust.name}</CardTitle>
                      <CardDescription className="text-xs flex items-center gap-2 mt-1">
                        <span>📞 {cust.phone}</span>
                        <span>•</span>
                        <span>📍 {cust.location}</span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {cust.id}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 text-xs space-y-3">
                  {/* Key Stats Row */}
                  <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Completed</span>
                      <p className="font-bold text-emerald-600 text-sm">{completedCount} Projects</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Ongoing</span>
                      <p className="font-bold text-amber-600 text-sm">{ongoingCount} Projects</p>
                    </div>
                  </div>

                  {/* Financial Stats */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Contract Value:</span>
                      <span className="font-bold text-foreground">₹{totalCustRevenue.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Collected Amount:</span>
                      <span className="font-bold text-emerald-600">₹{totalCustCollected.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Pending Amount:</span>
                      <span className="font-bold text-rose-600">₹{totalCustPending.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground border-t pt-2 flex justify-between items-center">
                    <span>Recent Payments: {custPayments.length} txns</span>
                    <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                      Full Ledger <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* CUSTOMER DETAIL MODAL */}
      {selectedCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-3xl rounded-xl border shadow-xl max-h-[85vh] overflow-y-auto p-6">
            {(() => {
              const custProjects = projects.filter(
                (p) => p.customerName.toLowerCase().trim() === selectedCustomer.name.toLowerCase().trim()
              );
              const custEnquiries = enquiries.filter(
                (e) => e.customerName.toLowerCase().trim() === selectedCustomer.name.toLowerCase().trim()
              );
              const custPayments = payments.filter((pay) =>
                custProjects.some((p) => p.id === pay.projectId)
              );

              const totalVal = custProjects.reduce((s, p) => s + p.projectValue, 0);
              const totalRec = custProjects.reduce((s, p) => s + p.receivedAmount, 0);
              const totalBal = Math.max(0, totalVal - totalRec);

              return (
                <div className="space-y-6">
                  <DialogHeader className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <DialogTitle className="text-xl font-bold text-foreground">
                          {selectedCustomer.name}
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          📞 {selectedCustomer.phone} • 📍 {selectedCustomer.location}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        {selectedCustomer.id}
                      </Badge>
                    </div>
                  </DialogHeader>

                  {/* Financial Overview Cards */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-[10px] uppercase font-bold text-blue-900">Total Lifetime Value</span>
                      <p className="text-lg font-extrabold text-blue-700 mt-1">₹{totalVal.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-900">Total Collected</span>
                      <p className="text-lg font-extrabold text-emerald-700 mt-1">₹{totalRec.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                      <span className="text-[10px] uppercase font-bold text-rose-900">Outstanding Due</span>
                      <p className="text-lg font-extrabold text-rose-700 mt-1">₹{totalBal.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  {/* Projects History */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Projects History ({custProjects.length})
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground border-b">
                          <tr>
                            <th className="p-2.5 pl-3">Project ID</th>
                            <th className="p-2.5">Nature of Work</th>
                            <th className="p-2.5">Contract Value</th>
                            <th className="p-2.5">Balance</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {custProjects.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                No projects recorded for this customer.
                              </td>
                            </tr>
                          ) : (
                            custProjects.map((p) => (
                              <tr key={p.id} className="hover:bg-accent/40">
                                <td className="p-2.5 pl-3 font-bold text-blue-600">{p.id}</td>
                                <td className="p-2.5 font-medium">{p.natureOfWork}</td>
                                <td className="p-2.5">₹{p.projectValue.toLocaleString("en-IN")}</td>
                                <td className="p-2.5 font-bold text-rose-600">₹{p.balanceAmount.toLocaleString("en-IN")}</td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {p.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Enquiries History */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Enquiries & Quotations History ({custEnquiries.length})
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground border-b">
                          <tr>
                            <th className="p-2.5 pl-3">Enquiry ID</th>
                            <th className="p-2.5">Service / Leakage Type</th>
                            <th className="p-2.5">Quotation Amount</th>
                            <th className="p-2.5">Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {custEnquiries.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                No enquiries logged for this customer.
                              </td>
                            </tr>
                          ) : (
                            custEnquiries.map((e) => (
                              <tr key={e.id} className="hover:bg-accent/40">
                                <td className="p-2.5 pl-3 font-bold text-blue-600">{e.id}</td>
                                <td className="p-2.5 font-medium">{e.leakageType}</td>
                                <td className="p-2.5">₹{(e.quotationAmount || 0).toLocaleString("en-IN")}</td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {e.customerDecision}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment Transactions Ledger */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Transactions Ledger ({custPayments.length})
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground border-b">
                          <tr>
                            <th className="p-2.5 pl-3">Date</th>
                            <th className="p-2.5">Project ID</th>
                            <th className="p-2.5">Mode</th>
                            <th className="p-2.5">Reference #</th>
                            <th className="p-2.5 text-right pr-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {custPayments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                No payments recorded yet.
                              </td>
                            </tr>
                          ) : (
                            custPayments.map((pay) => (
                              <tr key={pay.id} className="hover:bg-accent/40">
                                <td className="p-2.5 pl-3 font-medium">{pay.paymentDate}</td>
                                <td className="p-2.5 font-semibold text-blue-600">{pay.projectId}</td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {pay.mode}
                                  </Badge>
                                </td>
                                <td className="p-2.5 font-mono">{pay.referenceNumber}</td>
                                <td className="p-2.5 text-right pr-3 font-bold text-emerald-600">
                                  ₹{pay.amount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
