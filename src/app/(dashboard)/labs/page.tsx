"use client";

import * as React from "react";
import {
  Beaker,
  Filter as FilterIcon,
  Download,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AddLabResultDialog } from "@/components/labs/add-lab-result-dialog";
import { logClientError } from "@/lib/client-logger";

interface LabResult {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  resultValue: string | null;
  unit: string | null;
  referenceRange: string | null;
  status: string;
  performedAt: string | null;
  reportUrl: string | null;
  createdAt: string;
}

export default function LabResultsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<LabResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchLabResults();
  }, []);

  const fetchLabResults = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/labs");
      if (!response.ok) throw new Error("Failed to fetch lab results");
      const data = await response.json();
      setResults(data);
    } catch (error) {
      toast.error("Failed to load lab results");
      logClientError("Lab results fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      [
        "Patient Name",
        "Test Name",
        "Result Value",
        "Unit",
        "Reference Range",
        "Status",
        "Performed Date",
      ],
      ...results.map((r) => [
        r.patientName,
        r.testName,
        r.resultValue || "-",
        r.unit || "-",
        r.referenceRange || "-",
        r.status,
        r.performedAt ? new Date(r.performedAt).toLocaleDateString() : "-",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lab-results-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Lab results exported successfully");
  };

  const filteredResults = results.filter((result) => {
    const matchesSearch =
      result.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.testName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || result.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "abnormal":
        return "bg-red-100 text-red-800";
      case "reviewed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isAbnormal = (status: string) => status === "abnormal";
  const isHighlightedRow = (status: string) => status === "abnormal";

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
            <Beaker className="w-6 h-6 inline mr-2" />
            Lab Results
          </h2>
          <p className="text-sm text-neutral-500">
            Track and manage patient laboratory test results.
          </p>
        </div>

        <AddLabResultDialog onSuccess={fetchLabResults} />
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
        <div className="px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Input
            type="search"
            placeholder="Search patient name or test name..."
            className="w-full sm:max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FilterIcon className="w-4 h-4" /> Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!statusFilter}
                  onCheckedChange={() => setStatusFilter(null)}
                >
                  All
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "completed"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "completed" ? null : "completed",
                    )
                  }
                >
                  Completed
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "pending"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "pending" ? null : "pending",
                    )
                  }
                >
                  Pending
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "abnormal"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "abnormal" ? null : "abnormal",
                    )
                  }
                >
                  Abnormal
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "reviewed"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "reviewed" ? null : "reviewed",
                    )
                  }
                >
                  Reviewed
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-neutral-500">Loading lab results...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Beaker className="w-12 h-12 text-neutral-300 mb-4" />
              <p className="text-neutral-600">No lab results found</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b">Patient</th>
                  <th className="px-6 py-4 border-b">Test Name</th>
                  <th className="px-6 py-4 border-b">Result</th>
                  <th className="px-6 py-4 border-b">Status</th>
                  <th className="px-6 py-4 border-b hidden md:table-cell">
                    Performed
                  </th>
                  <th className="px-6 py-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
                {filteredResults.map((result) => (
                  <tr
                    key={result.id}
                    className={`transition ${
                      isHighlightedRow(result.status)
                        ? "bg-red-50 text-red-950 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-50 dark:hover:bg-red-950/40"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[5px] bg-purple-100 text-purple-700 font-bold flex justify-center items-center text-xs">
                          {result.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <p className="font-medium">{result.patientName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{result.testName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {result.resultValue && (
                          <>
                            <p className="font-medium">
                              {result.resultValue} {result.unit || ""}
                            </p>
                            {result.referenceRange && (
                              <p
                                className={`text-xs ${
                                  isHighlightedRow(result.status)
                                    ? "text-red-700 dark:text-red-200/80"
                                    : "text-neutral-500"
                                }`}
                              >
                                Range: {result.referenceRange}
                              </p>
                            )}
                          </>
                        )}
                        {!result.resultValue && (
                          <p className="text-neutral-500">-</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(result.status)}`}
                      >
                        {isAbnormal(result.status) && (
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                        )}
                        {result.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {result.performedAt
                        ? new Date(result.performedAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {result.reportUrl ? (
                        <a
                          href={result.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className={
                              isHighlightedRow(result.status)
                                ? "text-red-900 hover:bg-red-200/60 dark:text-red-100 dark:hover:bg-red-900/30"
                                : undefined
                            }
                          >
                            View Report
                          </Button>
                        </a>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            isHighlightedRow(result.status)
                              ? "text-red-900 hover:bg-red-200/60 dark:text-red-100 dark:hover:bg-red-900/30"
                              : undefined
                          }
                        >
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
