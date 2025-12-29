// Data Management Section Component (View)

import React from "react";
import { Upload, FileText, Download } from "lucide-react";
import Card from "../ui/Card";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";

interface DataManagementProps {
  id: string;
}

export const DataManagement: React.FC<DataManagementProps> = ({ id }) => (
  <div id={id} className="space-y-8 scroll-mt-20">
    {/* Batch Upload Formats */}
    <Card className="p-6">
      <h2 className="text-xl text-neutral-900 mb-4 flex items-center border-b pb-2">
        <Upload className="w-5 h-5 mr-2" />
        Batch Upload Formats
      </h2>
      <div className="space-y-4">
        <div>
          <Label>Supported File Formats</Label>
          <div className="flex gap-2 mt-2">
            <span className="px-3 py-1 bg-neutral-100 rounded-rd text-sm text-neutral-600">
              .csv
            </span>
            <span className="px-3 py-1 bg-neutral-100 rounded-rd text-sm text-neutral-600">
              .xlsx
            </span>
            <span className="px-3 py-1 bg-neutral-100 rounded-rd text-sm text-neutral-600">
              .xls
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Template (Programs)
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Template (Students)
          </Button>
        </div>
      </div>
    </Card>

    {/* Export Reports */}
    <Card className="p-6">
      <h2 className="text-xl text-neutral-900 mb-4 flex items-center border-b pb-2">
        <FileText className="w-5 h-5 mr-2" />
        Export Reports
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="report-type">Report Type</Label>
            <select
              id="report-type"
              className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
            >
              <option>Student Performance</option>
              <option>AI Metrics Summary</option>
              <option>Program Overview</option>
              <option>Essay Submissions</option>
            </select>
          </div>
          <div>
            <Label htmlFor="report-format">Format</Label>
            <select
              id="report-format"
              className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
            >
              <option>PDF</option>
              <option>CSV</option>
              <option>Excel (.xlsx)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date-from">Date From</Label>
            <Input
              id="date-from"
              type="date"
              className="mt-1"
              defaultValue={
                new Date(new Date().getFullYear(), 0, 1)
                  .toISOString()
                  .split("T")[0]
              }
            />
          </div>
          <div>
            <Label htmlFor="date-to">Date To</Label>
            <Input
              id="date-to"
              type="date"
              className="mt-1"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary-300">
          <Download className="w-4 h-4 mr-2" />
          Generate & Export Report
        </Button>
      </div>
    </Card>
  </div>
);

