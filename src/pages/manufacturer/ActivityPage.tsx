import { PageHeader } from '../../components/ui';
import { VerificationLogTable } from '../../components/verification/VerificationLogTable';
import { useManufacturerId } from '../../hooks/useCurrentManufacturer';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function ActivityPage() {
  useDocumentTitle('Verification Activity');
  const mId = useManufacturerId();
  return (
    <>
      <PageHeader
        title="Verification Activity"
        description="Every SMS check customers made on your products. A code checked more times than allowed is marked Suspicious."
      />
      <VerificationLogTable manufacturerId={mId} />
    </>
  );
}
