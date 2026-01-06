import { workflowStages } from "@/data/workflow-stages";
import WorkflowStagesTable from "./workflow-stages-table";

const WorkflowStagesPage = () => {
  const paginatedStages = {
    data: workflowStages,
    meta: {
      page: 1,
      limit: 10,
      total: workflowStages.length,
    },
  };

  return <WorkflowStagesTable stages={paginatedStages} />;
};

export default WorkflowStagesPage;
