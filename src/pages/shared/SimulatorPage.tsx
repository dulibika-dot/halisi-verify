import { PageHeader } from '../../components/ui';
import { SmsSimulator } from '../../components/verification/SmsSimulator';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

/** Used by both the Manufacturer App and the Admin Dashboard */
export function SimulatorPage() {
  useDocumentTitle('SMS Simulator');
  return (
    <>
      <PageHeader
        eyebrow="Demonstration tool"
        title="SMS Verification Simulator"
        description="Shows how a customer checks a product by SMS. Results are recorded in the same logs the real SMS gateway will use once the backend is connected."
      />
      <SmsSimulator />
    </>
  );
}
