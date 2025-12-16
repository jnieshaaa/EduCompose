import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Clock, AlertCircle, Calendar, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

// Mock class data
const CLASS_DATA: Record<number, { code: string; name: string; instructor: string; term: string; section: string }> = {
  1: { code: "PC 4121", name: "CS Thesis 1", instructor: "Prof. Smith", term: "1st Semester A.Y. 2025-2026", section: "BSCS-DS 4B" },
  2: { code: "PC 4122", name: "CS Thesis 1", instructor: "Joselle Banocnoc", term: "1st Semester A.Y. 2025-2026", section: "BSCS-DS 4B" },
  3: { code: "TC 4103", name: "Advanced Programming", instructor: "Prof. Johnson", term: "1st Semester A.Y. 2025-2026", section: "BSCS-DS 4B" },
};

// Mock activities data
const ACTIVITIES = [
  {
    id: 1,
    title: "QUIZ #1",
    type: "Quiz",
    status: "DONE",
    loginTime: "Friday, 17 October 2025 / 2:00 pm - 3:00 pm",
    postedDate: "October 17, 2025 at 12:00 am",
    color: "purple",
    activityId: "quiz-1"
  },
  {
    id: 2,
    title: "019_LU AA-FO-19 Thesis Adviser Evaluation Form for Students",
    type: "Finals/Activity",
    status: "DONE",
    deadline: "December 14, 2025 (Sunday) at 5:00 pm",
    postedDate: "December 13, 2025 at 9:26 pm",
    instructions: "Please accomplish the attached form and upload the signed document in pdf format here in iLearnU and...",
    color: "green",
    activityId: "eval-form"
  },
  {
    id: 3,
    title: "007_LU AA-FO-07 Panel Comment Sheet",
    type: "Finals/Activity",
    status: "DONE",
    deadline: "December 12, 2025 (Friday) at 5:00 pm",
    postedDate: "December 4, 2025 at 12:04 pm",
    instructions: "Please upload the signed document in pdf format here in iLearnU and in the attached google drive fol...",
    color: "green",
    activityId: "panel-comment"
  },
];

export function ClassDetailTab() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const classData = CLASS_DATA[Number(classId)] || CLASS_DATA[2];

  const handleActivityClick = (activityId: string) => {
    // Navigate to SubmitEssayTab with activity ID as query param
    navigate(`/Student/Submit?activityId=${activityId}&classId=${classId}`);
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/Student/Classes')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to My Classes
      </Button>

      {/* Course Header Banner */}
      <div className="mb-6 bg-success-default rounded-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              #{classId} - {classData.code}
            </h1>
            <p className="text-lg opacity-90">{classData.name}</p>
            <p className="text-sm opacity-75 mt-1">{classData.instructor}</p>
          </div>
          <Button className="bg-white text-success-default hover:bg-neutral-100 shadow-sm">
            My Performance
          </Button>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-4">
        {ACTIVITIES.map((activity) => (
          <Card
            key={activity.id}
            className={`p-6 cursor-pointer hover:shadow-lg transition-all ${
              activity.color === 'purple' 
                ? 'border-l-4 border-purple-500' 
                : 'border-l-4 border-success-default'
            }`}
            onClick={() => handleActivityClick(activity.activityId)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Header with type and status */}
                <div className={`mb-3 px-4 py-2 rounded-t-md ${
                  activity.color === 'purple'
                    ? 'bg-purple-500 text-white'
                    : 'bg-success-default text-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{activity.type}</span>
                    <Badge className="bg-white/20 text-white border-white/30">
                      {activity.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="px-1">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                    {activity.title}
                  </h3>

                  {activity.instructions && (
                    <p className="text-sm text-neutral-600 mb-3">
                      {activity.instructions}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-neutral-500">
                    {activity.loginTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span><strong>LOGIN TIME:</strong> {activity.loginTime}</span>
                      </div>
                    )}
                    {activity.deadline && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-warning-default" />
                        <span className="font-medium text-warning-default">
                          <strong>Deadline:</strong> {activity.deadline}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Posted {activity.postedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

