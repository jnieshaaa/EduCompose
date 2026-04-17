import { useState, useMemo } from "react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { 
  MoreVertical, 
  // Eye, 
  // Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown 
} from "lucide-react";
import type { Student } from "../../types/academic";

interface StudentsTableViewProps {
  students: Student[];
  urlSectionFilter: string | null;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void; 
  onViewEssayHistory?: (student: Student) => void;
  isLoading?: boolean;
}

export function StudentsTableView({
  students,
  urlSectionFilter,
  // onEditStudent,
  onDeleteStudent,
  // onViewEssayHistory,
  isLoading = false,
}: StudentsTableViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Sorting
  const sortedStudents = useMemo(() => {
    let sortable = [...students];
    if (sortConfig) {
      sortable.sort((a, b) => {
        let aVal = "";
        let bVal = "";
        
        switch (sortConfig.key) {
          case 'id':
            aVal = a.student_code.toLowerCase();
            bVal = b.student_code.toLowerCase();
            break;
          case 'name':
            aVal = `${a.last_name} ${a.first_name}`.toLowerCase();
            bVal = `${b.last_name} ${b.first_name}`.toLowerCase();
            break;
          case 'block':
            aVal = a.block_name.toLowerCase();
            bVal = b.block_name.toLowerCase();
            break;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [students, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedStudents.slice(indexOfFirstItem, indexOfLastItem);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 8) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 6; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 5; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-neutral-100 transition-colors"
                onClick={() => requestSort('id')}
              >
                <div className="flex items-center gap-1.5 uppercase text-[10px] font-black tracking-widest text-neutral-400">
                  Student ID
                  {sortConfig?.key === 'id' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-neutral-100 transition-colors"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center gap-1.5 uppercase text-[10px] font-black tracking-widest text-neutral-400">
                  Name
                  {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                </div>
              </TableHead>
              {!urlSectionFilter && (
                <TableHead 
                  className="cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => requestSort('block')}
                >
                  <div className="flex items-center gap-1.5 uppercase text-[10px] font-black tracking-widest text-neutral-400">
                    Block
                    {sortConfig?.key === 'block' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                  </div>
                </TableHead>
              )}
              <TableHead className="uppercase text-[10px] font-black tracking-widest text-neutral-400">Email</TableHead>
              <TableHead className='text-right uppercase text-[10px] font-black tracking-widest text-neutral-400'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.map((student) => (
              <TableRow key={student.id} className="hover:bg-neutral-50/50 transition-colors group">
                <TableCell>
                  <div className='text-sm font-mono font-medium text-neutral-500'>{student.student_code}</div>
                </TableCell>
                <TableCell>
                  <div className='text-sm text-neutral-900 font-bold'>
                    {student.last_name}, {student.first_name} {student.middle_name || ""}
                  </div>
                </TableCell>
                {!urlSectionFilter && (
                  <TableCell>
                    <Badge
                      variant='outline'
                      className='bg-primary/5 text-primary border-primary/20 font-bold px-2 py-0.5 text-[10px]'
                    >
                      {student.block_name}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>
                  <div className='text-sm text-neutral-500 font-medium'>{student.email}</div>
                </TableCell>
                <TableCell className='text-right'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' size='sm' className="hover:bg-neutral-100 rounded-lg h-8 w-8 p-0">
                        <MoreVertical className='w-4 h-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className="w-48 p-2 rounded-xl shadow-xl border border-neutral-100 animate-in fade-in zoom-in duration-200">
                      {/* <DropdownMenuItem
                        className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onViewEssayHistory) onViewEssayHistory(student);
                        }}
                      >
                        <Eye className='w-4 h-4 text-primary' />
                        View History
                      </DropdownMenuItem> */}
                      {/* <DropdownMenuItem
                        className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditStudent(student);
                        }}
                      >
                        <Edit className='w-4 h-4 text-amber-500' />
                        Edit Student
                      </DropdownMenuItem> */}
                      {/* <div className="my-1 border-t border-neutral-100" /> */}
                      <DropdownMenuItem
                        className='flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg cursor-pointer font-medium'
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteStudent(student.id);
                        }}
                      >
                        <Trash2 className='w-4 h-4' />
                        Remove Student
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && students.length > itemsPerPage && (
        <div className="px-6 py-6 bg-white border-t border-neutral-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col">
              <div className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">
                Viewing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, students.length)} of {students.length}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 text-neutral-400 hover:text-neutral-900 disabled:opacity-30 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1.5">
                {getPageNumbers().map((page, i) => (
                  page === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-neutral-300">...</span>
                  ) : (
                    <button
                      key={`page-${page}`}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`min-w-[32px] h-8 flex items-center justify-center text-xs font-black rounded-lg transition-all border ${
                        currentPage === page
                          ? "bg-neutral-900 border-neutral-900 text-white shadow-xl scale-110"
                          : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 text-neutral-400 hover:text-neutral-900 disabled:opacity-30 transition-colors"
                title="Next Page"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap">Show per page</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-black text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[65px]"
              >
                {[10, 25, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
