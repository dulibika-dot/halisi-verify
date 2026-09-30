import { PageHeader } from '../../components/ui';
import { ReportsTable } from '../../components/reports/ReportsTable';
import { useManufacturerId } from '../../hooks/useCurrentManufacturer';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function ManufacturerReportsPage() {
  useDocumentTitle('Reports');
  const mId = useManufacturerId();
  return (
    <>
      <PageHeader
        title="Counterfeit Reports"
        description="Reports customers sent about your products. The regulator/admin team investigates and updates the status."
      />
      <ReportsTable manufacturerId={mId} />
    </>
  );
}
