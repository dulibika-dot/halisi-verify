import { PageHeader } from '../../components/ui';
import { VerificationLogTable } from '../../components/verification/VerificationLogTable';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function VerificationLogsPage() {
  useDocumentTitle('Verification Logs');
  return (
    <>
      <PageHeader
        title="Verification Logs"
        description="Every verification request received by the system, across all manufacturers — including codes that don't exist."
      />
      <VerificationLogTable showManufacturer />
    </>
  );
}
