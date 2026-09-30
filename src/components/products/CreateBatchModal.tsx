import { useEffect, useState, type FormEvent } from 'react';
import { Package, Sparkles } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../../data/products';
import { useToast } from '../../context/ToastContext';
import * as api from '../../services/api';
import type { CreateBatchInput, ProductWithStats } from '../../types';
import { formatNumber, toInputDate } from '../../utils/format';
import { Button, Input, Modal, Select, Textarea } from '../ui';

interface Props {
  open: boolean;
  onClose: () => void;
  manufacturerId: string;
  products: ProductWithStats[];
  onCreated: () => void;
}

type Errors = Partial<Record<keyof CreateBatchInput, string>>;

const today = toInputDate(new Date());

const emptyForm = (): Record<keyof CreateBatchInput, string> => ({
  productName: '',
  category: '',
  description: '',
  batchNumber: '',
  quantity: '',
  manufacturingDate: today,
  expiryDate: '',
});

function validate(f: Record<keyof CreateBatchInput, string>): Errors {
  const e: Errors = {};
  if (f.productName.trim().length < 3) e.productName = 'Enter the product name (at least 3 characters).';
  if (!f.category) e.category = 'Choose a category.';
  if (f.description.length > 300) e.description = 'Keep the description under 300 characters.';
  if (!/^[A-Za-z0-9-]{4,20}$/.test(f.batchNumber.trim())) e.batchNumber = 'Use 4–20 letters, numbers or dashes, e.g. B2026-031.';
  const qty = Number(f.quantity);
  if (!f.quantity || !Number.isInteger(qty) || qty < 1) e.quantity = 'Enter a whole number of units.';
  else if (qty > 1_000_000) e.quantity = 'Maximum 1,000,000 units per batch.';
  if (!f.manufacturingDate) e.manufacturingDate = 'Required.';
  else if (f.manufacturingDate > today) e.manufacturingDate = 'Cannot be in the future.';
  if (!f.expiryDate) e.expiryDate = 'Required.';
  else if (f.manufacturingDate && f.expiryDate <= f.manufacturingDate) e.expiryDate = 'Must be after the manufacturing date.';
  return e;
}

export function CreateBatchModal({ open, onClose, manufacturerId, products, onCreated }: Props) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setErrors({});
      setSubmitted(false);
    }
  }, [open]);

  const set = (key: keyof CreateBatchInput, value: string) => {
    const next = { ...form, [key]: value };
    // Picking an existing product fills in its category and description
    if (key === 'productName') {
      const match = products.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
      if (match) Object.assign(next, { category: match.category, description: match.description });
    }
    setForm(next);
    if (submitted) setErrors(validate(next));
  };

  const suggestBatchNumber = () => set('batchNumber', `B${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const batch = await api.createProductBatch(manufacturerId, { ...form, quantity: Number(form.quantity) });
      toast.success('Product batch created successfully.', `${formatNumber(batch.codesGenerated)} verification codes generated for ${batch.batchNumber}.`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Could not create batch', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      size="lg"
      title="Create product batch"
      description="Register a production batch. A unique SMS verification code is generated for every unit."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="create-batch-form" loading={saving} icon={Package}>
            {saving ? 'Generating codes…' : 'Create batch'}
          </Button>
        </>
      }
    >
      <form id="create-batch-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Product name"
          required
          list="product-suggestions"
          placeholder="e.g. XYZ Cooking Oil 1L"
          value={form.productName}
          onChange={(e) => set('productName', e.target.value)}
          error={errors.productName}
          hint="Pick an existing product or type a new one."
          wrapperClassName="sm:col-span-2"
        />
        <datalist id="product-suggestions">
          {products.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
        <Select
          label="Category"
          required
          placeholder="Select category"
          options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          error={errors.category}
        />
        <Input
          label="Batch number"
          required
          placeholder="B2026-031"
          value={form.batchNumber}
          onChange={(e) => set('batchNumber', e.target.value.toUpperCase())}
          error={errors.batchNumber}
          trailing={
            <button
              type="button"
              onClick={suggestBatchNumber}
              className="rounded-lg p-1.5 text-brand-600 transition hover:bg-brand-50"
              title="Suggest a batch number"
              aria-label="Suggest a batch number"
            >
              <Sparkles className="size-4" />
            </button>
          }
        />
        <Textarea
          label="Description"
          placeholder="Short description printed on the verification reply (optional)"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          hint={`${form.description.length}/300`}
          wrapperClassName="sm:col-span-2"
          rows={3}
        />
        <Input
          label="Quantity (units)"
          required
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="5000"
          value={form.quantity}
          onChange={(e) => set('quantity', e.target.value)}
          error={errors.quantity}
          hint={form.quantity && !errors.quantity ? `${formatNumber(Number(form.quantity))} codes will be generated` : undefined}
          wrapperClassName="sm:col-span-2"
        />
        <Input
          label="Manufacturing date"
          required
          type="date"
          max={today}
          value={form.manufacturingDate}
          onChange={(e) => set('manufacturingDate', e.target.value)}
          error={errors.manufacturingDate}
        />
        <Input
          label="Expiry date"
          required
          type="date"
          min={form.manufacturingDate}
          value={form.expiryDate}
          onChange={(e) => set('expiryDate', e.target.value)}
          error={errors.expiryDate}
        />
      </form>
    </Modal>
  );
}
