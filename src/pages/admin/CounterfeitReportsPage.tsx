import { PageHeader } from '../../components/ui';
import { ReportsTable } from '../../components/reports/ReportsTable';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function CounterfeitReportsPage() {
  useDocumentTitle('Counterfeit Reports');
  return (
    <>
      <PageHeader
        title="Counterfeit Reports"
        description="Reports customers send by SMS (REPORT <code> <reason>). Review each one and move it through the investigation workflow."
      />
      <ReportsTable editable />
    </>
  );
}
