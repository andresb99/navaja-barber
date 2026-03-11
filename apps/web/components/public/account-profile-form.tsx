'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Pencil } from 'lucide-react';
import { Avatar, Button, Input, Select, SelectItem } from '@heroui/react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface AccountProfileFormProps {
  initialFullName: string;
  initialPhone: string;
  initialAvatarUrl: string;
  initialPreferredPaymentMethod?: 'mercado_pago' | 'card' | 'cash' | '';
  initialPreferredCardBrand?: string;
  initialPreferredCardLast4?: string;
  email: string;
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email.trim();
  if (!source) {
    return 'U';
  }

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const first = parts[0] || '';
    return first.slice(0, 2).toUpperCase();
  }

  const first = parts[0] || '';
  const second = parts[1] || '';
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(file);
  });
}

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const inputClassNames = {
  base: 'profile-inline-field w-full outline-none group-data-[focus-visible=true]:outline-none group-data-[focus-visible=true]:ring-0',
  mainWrapper: 'w-full',
  inputWrapper:
    'min-h-12 rounded-2xl border px-2 shadow-none data-[hover=true]:translate-x-0 group-data-[focus-visible=true]:ring-0 group-data-[focus-visible=true]:ring-transparent group-data-[focus-visible=true]:ring-offset-0',
  innerWrapper: 'border-0 bg-transparent p-0 shadow-none ring-0 outline-none',
  label: 'text-[11px] font-semibold text-slate/55 dark:text-slate-400',
  input:
    'border-0 !border-0 bg-transparent text-sm font-medium text-slate-100 placeholder:text-slate/35 !outline-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!shadow-none',
} as const;

const disabledInputClassNames = {
  ...inputClassNames,
  inputWrapper:
    'min-h-12 rounded-2xl border px-2 shadow-none data-[hover=true]:bg-inherit data-[focus=true]:bg-inherit group-data-[disabled=true]:opacity-100 group-data-[disabled=true]:cursor-not-allowed',
  input:
    'border-0 bg-transparent text-sm font-medium text-slate/40 placeholder:text-slate/30 !outline-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!shadow-none',
} as const;

const editableInputClassNames = {
  ...inputClassNames,
  inputWrapper:
    'min-h-12 rounded-2xl border px-2 shadow-none data-[hover=true]:bg-inherit data-[focus=true]:bg-inherit group-data-[focus=true]:border-inherit group-data-[focus-visible=true]:border-inherit',
  input: 'text-sm font-medium text-slate-100 placeholder:text-slate/35',
} as const;
const editButtonClassName =
  'inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-white/70 transition-colors md:hover:text-brass focus:outline-none focus-visible:text-brass';

const editButtonActiveClassName = 'text-brass';

function getSingleSelectionValue(keys: 'all' | Iterable<unknown>) {
  if (keys === 'all') {
    return '';
  }

  const first = Array.from(keys)[0];
  if (typeof first === 'string' || typeof first === 'number') {
    return String(first);
  }

  return '';
}

export function AccountProfileForm({
  initialFullName,
  initialPhone,
  initialAvatarUrl,
  initialPreferredPaymentMethod = '',
  initialPreferredCardBrand = '',
  initialPreferredCardLast4 = '',
  email,
}: AccountProfileFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fullNameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [savedFullName, setSavedFullName] = useState(initialFullName);
  const [savedPhone, setSavedPhone] = useState(initialPhone);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(initialAvatarUrl);
  const [savedPreferredPaymentMethod, setSavedPreferredPaymentMethod] = useState(
    initialPreferredPaymentMethod,
  );
  const [savedPreferredCardBrand, setSavedPreferredCardBrand] = useState(initialPreferredCardBrand);
  const [savedPreferredCardLast4, setSavedPreferredCardLast4] = useState(initialPreferredCardLast4);
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<
    'mercado_pago' | 'card' | 'cash' | ''
  >(initialPreferredPaymentMethod);
  const [preferredCardBrand, setPreferredCardBrand] = useState(initialPreferredCardBrand);
  const [preferredCardLast4, setPreferredCardLast4] = useState(initialPreferredCardLast4);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const initials = getInitials(fullName, email);
  const avatarProps = avatarUrl.trim() ? { src: avatarUrl.trim() } : {};
  const hasChanges =
    fullName.trim() !== savedFullName.trim() ||
    phone.trim() !== savedPhone.trim() ||
    avatarUrl.trim() !== savedAvatarUrl.trim() ||
    preferredPaymentMethod !== savedPreferredPaymentMethod ||
    preferredCardBrand.trim() !== savedPreferredCardBrand.trim() ||
    preferredCardLast4.trim() !== savedPreferredCardLast4.trim();

  function handleEditToggle(field: 'name' | 'phone') {
    if (field === 'name') {
      const nextValue = !isEditingName;
      setIsEditingName(nextValue);
      if (nextValue) {
        requestAnimationFrame(() => fullNameInputRef.current?.focus());
      }
      return;
    }

    const nextValue = !isEditingPhone;
    setIsEditingPhone(nextValue);
    if (nextValue) {
      requestAnimationFrame(() => phoneInputRef.current?.focus());
    }
  }

  async function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen valido.');
      setMessage(null);
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError('La imagen no puede superar 2 MB.');
      setMessage(null);
      event.target.value = '';
      return;
    }

    try {
      setError(null);
      setMessage(null);
      const nextAvatarUrl = await readFileAsDataUrl(file);
      setAvatarUrl(nextAvatarUrl);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'No se pudo leer la imagen.');
      setMessage(null);
    } finally {
      event.target.value = '';
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = fullName.trim();
    const normalizedPhone = phone.trim();
    const normalizedAvatarUrl = avatarUrl.trim();
    const normalizedPreferredCardBrand = preferredCardBrand.trim();
    const normalizedPreferredCardLast4 = preferredCardLast4.trim();

    if (normalizedName.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      setMessage(null);
      return;
    }

    if (normalizedPhone && normalizedPhone.length < 7) {
      setError('El telefono debe tener al menos 7 caracteres.');
      setMessage(null);
      return;
    }

    if (preferredPaymentMethod === 'card' && !/^\d{4}$/.test(normalizedPreferredCardLast4)) {
      setError('Para tarjeta debes indicar los ultimos 4 digitos.');
      setMessage(null);
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setMessage(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError(userError?.message || 'Tu sesion ya no es valida.');
          return;
        }

        const { error: saveError } = await supabase.from('user_profiles').upsert(
          {
            auth_user_id: user.id,
            full_name: normalizedName || null,
            phone: normalizedPhone || null,
            avatar_url: normalizedAvatarUrl || null,
            preferred_payment_method: preferredPaymentMethod || null,
            preferred_card_brand:
              preferredPaymentMethod === 'card' ? normalizedPreferredCardBrand || null : null,
            preferred_card_last4:
              preferredPaymentMethod === 'card' ? normalizedPreferredCardLast4 || null : null,
          },
          { onConflict: 'auth_user_id' },
        );

        if (saveError) {
          setError(saveError.message);
          return;
        }

        setSavedFullName(normalizedName);
        setSavedPhone(normalizedPhone);
        setSavedAvatarUrl(normalizedAvatarUrl);
        setSavedPreferredPaymentMethod(preferredPaymentMethod);
        setSavedPreferredCardBrand(
          preferredPaymentMethod === 'card' ? normalizedPreferredCardBrand : '',
        );
        setSavedPreferredCardLast4(
          preferredPaymentMethod === 'card' ? normalizedPreferredCardLast4 : '',
        );
        setIsEditingName(false);
        setIsEditingPhone(false);
        if (preferredPaymentMethod !== 'card') {
          setPreferredCardBrand('');
          setPreferredCardLast4('');
        }
        setMessage('Perfil actualizado.');
        window.dispatchEvent(new CustomEvent('profile-updated'));
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'No se pudo guardar el perfil.',
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="group relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          <Button
            type="button"
            isIconOnly
            radius="full"
            variant="light"
            className="relative block h-auto w-auto overflow-visible rounded-full p-0 focus-visible:ring-2 focus-visible:ring-brass/55"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Cambiar foto de perfil"
            title="Cambiar foto de perfil"
          >
            <Avatar
              {...avatarProps}
              name={fullName.trim() || email}
              fallback={initials}
              className="h-16 w-16 text-base font-semibold"
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-[background-color,opacity] duration-150 md:group-hover:bg-black/35 md:group-hover:opacity-100">
              <Pencil className="h-4 w-4 text-white/92" />
            </span>
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink dark:text-slate-100">Foto de perfil</p>
          <p className="text-xs text-slate/70 dark:text-slate-400">
            Haz click sobre el avatar para subir una imagen desde tu dispositivo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <Input
              ref={fullNameInputRef}
              id="profile-full-name"
              label="Nombre"
              labelPlacement="inside"
              isRequired
              value={fullName}
              onValueChange={setFullName}
              isDisabled={!isEditingName}
              variant="bordered"
              radius="lg"
              aria-label="Nombre"
              classNames={isEditingName ? editableInputClassNames : disabledInputClassNames}
              placeholder="Tu nombre"
            />
            <Button
              type="button"
              isIconOnly
              variant="light"
              className={`${editButtonClassName} ${isEditingName ? editButtonActiveClassName : ''}`}
              onClick={() => handleEditToggle('name')}
              aria-label={isEditingName ? 'Bloquear edicion de nombre' : 'Editar nombre'}
              title={isEditingName ? 'Bloquear edicion de nombre' : 'Editar nombre'}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Input
              ref={phoneInputRef}
              id="profile-phone"
              label="Telefono"
              labelPlacement="inside"
              value={phone}
              onValueChange={setPhone}
              isDisabled={!isEditingPhone}
              variant="bordered"
              radius="lg"
              aria-label="Telefono"
              classNames={isEditingPhone ? editableInputClassNames : disabledInputClassNames}
              placeholder="Tu telefono"
            />
            <Button
              type="button"
              isIconOnly
              variant="light"
              className={`${editButtonClassName} ${isEditingPhone ? editButtonActiveClassName : ''}`}
              onClick={() => handleEditToggle('phone')}
              aria-label={isEditingPhone ? 'Bloquear edicion de telefono' : 'Editar telefono'}
              title={isEditingPhone ? 'Bloquear edicion de telefono' : 'Editar telefono'}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Input
          id="profile-email"
          label="Email"
          labelPlacement="inside"
          value={email}
          isDisabled
          variant="bordered"
          radius="lg"
          aria-label="Email"
          classNames={disabledInputClassNames}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <Select
            aria-label="Metodo de pago preferido"
            label="Metodo de pago preferido"
            labelPlacement="inside"
            selectedKeys={preferredPaymentMethod ? [preferredPaymentMethod] : []}
            disallowEmptySelection={false}
            placeholder="Selecciona metodo"
            classNames={{
              label: 'text-[11px] font-semibold text-slate/55 dark:text-slate-400',
              value: 'text-sm font-medium text-slate-100',
              trigger:
                'min-h-12 rounded-2xl border px-2 shadow-none data-[hover=true]:translate-x-0',
            }}
            onSelectionChange={(keys) => {
              const value = getSingleSelectionValue(keys);
              if (value === 'mercado_pago' || value === 'card' || value === 'cash') {
                setPreferredPaymentMethod(value);
                return;
              }

              setPreferredPaymentMethod('');
              setPreferredCardBrand('');
              setPreferredCardLast4('');
            }}
          >
            <SelectItem key="mercado_pago" textValue="Mercado Pago">
              Mercado Pago
            </SelectItem>
            <SelectItem key="card" textValue="Tarjeta">
              Tarjeta
            </SelectItem>
            <SelectItem key="cash" textValue="Efectivo en local">
              Efectivo en local
            </SelectItem>
          </Select>
        </div>
        {preferredPaymentMethod === 'card' ? (
          <>
            <Input
              id="profile-card-brand"
              label="Marca de tarjeta"
              labelPlacement="inside"
              value={preferredCardBrand}
              onValueChange={setPreferredCardBrand}
              variant="bordered"
              radius="lg"
              aria-label="Marca de tarjeta"
              classNames={editableInputClassNames}
              placeholder="Visa, Mastercard..."
            />
            <Input
              id="profile-card-last4"
              label="Ultimos 4 digitos"
              labelPlacement="inside"
              value={preferredCardLast4}
              onValueChange={(value) => setPreferredCardLast4(value.replace(/\D/g, '').slice(0, 4))}
              variant="bordered"
              radius="lg"
              aria-label="Ultimos 4 digitos"
              classNames={editableInputClassNames}
              placeholder="1234"
            />
          </>
        ) : (
          <p className="md:col-span-2 self-center text-xs text-slate/70 dark:text-slate-400">
            No guardamos numero completo de tarjeta. Solo referencia de metodo preferido.
          </p>
        )}
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isPending}
          isDisabled={!hasChanges}
          variant="flat"
          className="rounded-full border border-brass/20 bg-brass/14 px-5 font-semibold text-brass transition data-[hover=true]:bg-brass/20 data-[disabled=true]:border-white/5 data-[disabled=true]:bg-white/[0.04] data-[disabled=true]:text-slate/40"
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
