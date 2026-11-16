import { useState, useEffect, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Upload, X, CheckCircle2, FileText, Check, Eye, Sparkles, Lock, FileCheck, Download } from 'lucide-react';
import { validateCpf, calculateAge } from '@telivityhaip/shared';
import { api } from '../../lib/api';
import type { ParsedIdDocument } from '../../lib/id-document-swipe';
import { useProperty } from '../../context/PropertyContext';
import Modal from '../ui/Modal';
import IdSwipeCapture from './IdSwipeCapture';
import AadhaarViewerModal, {
  generateSampleAadhaarFront,
  generateSampleAadhaarBack,
  maskAadhaar,
  triggerDownload,
} from './AadhaarViewerModal';
import type { Guest } from '../../types/guest';

export interface CreateGuestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newGuest: Guest) => void;
  initialSearchTerm?: string;
}

export default function CreateGuestModal({
  open,
  onClose,
  onSuccess,
  initialSearchTerm = '',
}: CreateGuestModalProps) {
  const { t } = useTranslation();
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();

  const { data: propertyData } = useQuery({
    queryKey: ['properties', propertyId],
    queryFn: () => api.get(`/v1/properties/${propertyId}`).then((r) => r.data),
    enabled: !!propertyId && open,
  });
  const property = propertyData?.data ?? propertyData;

  const defaultCountry = property?.countryCode ?? 'IN';
  const isBR = defaultCountry.toUpperCase() === 'BR';
  const minorGuardianRequired =
    property?.guestRegistrationConfig?.minorGuardianIdentificationRequired ??
    property?.settings?.minorGuardianIdentificationRequired !== false;

  // Complete Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [profession, setProfession] = useState('');
  const [nationality, setNationality] = useState('IN');

  // Minor & Guardian State
  const [guardianName, setGuardianName] = useState('');
  const [guardianTaxId, setGuardianTaxId] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('parent');
  const [hasMinorAuthorization, setHasMinorAuthorization] = useState(false);

  const [taxId, setTaxId] = useState('');
  const [idType, setIdType] = useState('aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [idProofFrontUrl, setIdProofFrontUrl] = useState('');
  const [idProofBackUrl, setIdProofBackUrl] = useState('');
  const [idIssuer, setIdIssuer] = useState('');
  const [idIssuerState, setIdIssuerState] = useState('');
  const [idCountry, setIdCountry] = useState('IN');
  const [idExpiry, setIdExpiry] = useState('');

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Karimnagar');
  const [stateProvince, setStateProvince] = useState('Telangana');
  const [postalCode, setPostalCode] = useState('505001');
  const [countryCode, setCountryCode] = useState('IN');

  const [vipLevel, setVipLevel] = useState('none');
  const [loyaltyNumber, setLoyaltyNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notes, setNotes] = useState('');
  const [gdprConsentMarketing, setGdprConsentMarketing] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Handle local file upload for ID proof (converting to base64 for instant preview & secure storage)
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (side === 'front') setIdProofFrontUrl(result);
      if (side === 'back') setIdProofBackUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadDemoAadhaar = () => {
    const dummyNum = '7823 4512 9012';
    setIdType('aadhaar');
    setIdNumber(dummyNum);
    setIdCountry('IN');
    setCountryCode('IN');
    const guestName = `${firstName || 'Banu'} ${lastName || 'Prasad'}`.trim();
    const addr = addressLine1
      ? `${addressLine1}, Karimnagar, Telangana - 505001`
      : 'H.No 4-12/A, Collectorate Road, Karimnagar, Telangana - 505001';
    setIdProofFrontUrl(generateSampleAadhaarFront(guestName, dummyNum));
    setIdProofBackUrl(generateSampleAadhaarBack(addr));
  };

  // Synchronize initial search term when modal opens
  useEffect(() => {
    if (open) {
      if (initialSearchTerm.trim()) {
        const parts = initialSearchTerm.trim().split(/\s+/);
        if (parts.length === 1) {
          setFirstName(parts[0]);
          setLastName('');
        } else if (parts.length > 1) {
          setFirstName(parts[0]);
          setLastName(parts.slice(1).join(' '));
        }
      }
      setNationality(defaultCountry || 'IN');
      setIdCountry(defaultCountry || 'IN');
      setCountryCode(defaultCountry || 'IN');
      setIdType(isBR ? 'cpf' : 'aadhaar');
      setCity('Karimnagar');
      setStateProvince('Telangana');
      setPostalCode('505001');
    }
  }, [open, initialSearchTerm, defaultCountry, isBR]);

  const age = calculateAge(dateOfBirth);
  const isMinor = age !== null && age < 18;

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setDateOfBirth('');
    setGender('');
    setProfession('');
    setNationality('IN');
    setGuardianName('');
    setGuardianTaxId('');
    setGuardianPhone('');
    setGuardianRelationship('parent');
    setHasMinorAuthorization(false);
    setTaxId('');
    setIdType(isBR ? 'cpf' : 'aadhaar');
    setIdNumber('');
    setIdProofFrontUrl('');
    setIdProofBackUrl('');
    setIdIssuer('');
    setIdIssuerState('');
    setIdCountry('IN');
    setIdExpiry('');
    setAddressLine1('');
    setAddressLine2('');
    setNeighborhood('');
    setCity('Karimnagar');
    setStateProvince('Telangana');
    setPostalCode('505001');
    setCountryCode('IN');
    setVipLevel('none');
    setLoyaltyNumber('');
    setCompanyName('');
    setNotes('');
    setGdprConsentMarketing(false);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/v1/guests', {
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        profession: profession || undefined,
        nationality: nationality || undefined,
        taxId: taxId || undefined,
        idType: idType || undefined,
        idNumber: idNumber || taxId || undefined,
        idProofType:
          idType === 'aadhaar'
            ? 'Aadhaar Card'
            : idType === 'passport'
              ? 'Passport'
              : idType === 'drivers_license'
                ? 'Driving License'
                : idType === 'voter_id'
                  ? 'Voter ID'
                  : idType === 'pan_card'
                    ? 'PAN Card'
                    : idType,
        idProofNumber: idNumber || taxId || undefined,
        idProofFrontUrl: idProofFrontUrl || undefined,
        idProofBackUrl: idProofBackUrl || undefined,
        idCountry: idCountry || undefined,
        idExpiry: idExpiry || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || 'Karimnagar',
        stateProvince: stateProvince || 'Telangana',
        postalCode: postalCode || '505001',
        countryCode: countryCode || 'IN',
        vipLevel: vipLevel !== 'none' ? vipLevel : undefined,
        companyName: companyName || undefined,
        loyaltyNumber: loyaltyNumber || undefined,
        notes: notes || undefined,
        gdprConsentMarketing,
        registrationData: {
          idProofFrontUrl: idProofFrontUrl || undefined,
          idProofBackUrl: idProofBackUrl || undefined,
          ...(idIssuer || idIssuerState || neighborhood
            ? { idIssuer, idIssuerState, neighborhood }
            : {}),
          ...(isMinor
            ? {
              isMinor: true,
              guardianName: guardianName || undefined,
              guardianTaxId: guardianTaxId || undefined,
              guardianPhone: guardianPhone || undefined,
              guardianRelationship: guardianRelationship || 'parent',
              hasMinorAuthorization,
            }
            : {}),
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      const createdGuest = res.data?.data ?? res.data;
      resetForm();
      if (onSuccess) {
        onSuccess(createdGuest);
      }
      onClose();
    },
  });

  const isCpfValid = taxId ? validateCpf(taxId) : true;
  const isGuardianCpfValid = guardianTaxId ? validateCpf(guardianTaxId) : true;

  function applyIdSwipe(doc: ParsedIdDocument) {
    if (doc.firstName) setFirstName(doc.firstName);
    if (doc.lastName) setLastName(doc.lastName);
    if (doc.dateOfBirth) setDateOfBirth(doc.dateOfBirth);
    if (doc.gender) setGender(doc.gender);
    if (doc.nationality) setNationality(doc.nationality);
    if (doc.idType) setIdType(doc.idType);
    if (doc.idNumber) setIdNumber(doc.idNumber);
    if (doc.idCountry) {
      setIdCountry(doc.idCountry);
      setCountryCode(doc.idCountry);
    }
    if (doc.idExpiry) setIdExpiry(doc.idExpiry);
    if (doc.addressLine1) setAddressLine1(doc.addressLine1);
    if (doc.city) setCity(doc.city);
    if (doc.stateProvince) setStateProvince(doc.stateProvince);
    if (doc.postalCode) setPostalCode(doc.postalCode);
  }

  return (
    <Modal open={open} onClose={onClose} title={t('guests.newGuest')} wide>
      <div className="space-y-6">
        <IdSwipeCapture active={open} onParsed={applyIdSwipe} />

        {/* Section 1: Personal Details */}
        <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold text-telivity-navy uppercase tracking-wider">
            {t('guests.sections.personal')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.firstName')} *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={`Ex: ${t('guests.placeholders.firstName')}`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.lastName')} *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={`Ex: ${t('guests.placeholders.lastName')}`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('common.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('guests.placeholders.email')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('common.phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('guests.placeholders.phone')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1 flex items-center justify-between">
                <span>{t('guests.labels.dateOfBirth')}</span>
                {age !== null && (
                  <span
                    className={`text-[11px] font-bold ${isMinor ? 'text-purple-700' : 'text-slate-500'}`}
                  >
                    {t('guests.ageYears', { age })}{' '}
                    {isMinor ? `(${t('guests.minorBadgeShort')})` : ''}
                  </span>
                )}
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white ${isMinor
                  ? 'border-purple-300 focus:border-purple-600'
                  : 'border-gray-200 focus:border-telivity-teal'
                  }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.gender')}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              >
                <option value="">{t('guests.none')}</option>
                <option value="male">{t('guests.genderOptions.male')}</option>
                <option value="female">{t('guests.genderOptions.female')}</option>
                <option value="other">{t('guests.genderOptions.other')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.labels.nationality')}
              </label>
              <input
                type="text"
                maxLength={2}
                value={nationality}
                onChange={(e) => setNationality(e.target.value.toUpperCase())}
                placeholder={defaultCountry}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:border-telivity-teal bg-white"
              />
            </div>
          </div>

          {/* GUARDIAN BLOCK WHEN MINOR DETECTED */}
          {isMinor && (
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3.5 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <ShieldAlert size={16} className="text-purple-600" />{' '}
                  {t('guests.guardian.title', { age })}{' '}
                  {minorGuardianRequired ? '*' : ''}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${minorGuardianRequired
                    ? 'text-purple-800 bg-purple-100 border border-purple-200'
                    : 'text-slate-700 bg-slate-100'
                    }`}
                >
                  {minorGuardianRequired
                    ? t('guests.guardian.badgeRequired')
                    : t('guests.guardian.badgeOptional')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1">
                    {t('guests.guardian.name')}{' '}
                    {minorGuardianRequired ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder={t('guests.guardian.namePlaceholder')}
                    className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1 flex items-center justify-between">
                    <span>
                      {t('guests.guardian.taxId')}{' '}
                      {minorGuardianRequired ? '*' : ''}
                    </span>
                    {isBR && guardianTaxId && (
                      <span
                        className={`text-[10px] font-semibold ${isGuardianCpfValid
                          ? 'text-green-700'
                          : 'text-amber-700'
                          }`}
                      >
                        {isGuardianCpfValid
                          ? t('guests.guardian.validCpf')
                          : t('guests.guardian.invalidCpf')}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={guardianTaxId}
                    onChange={(e) => setGuardianTaxId(e.target.value)}
                    placeholder={t('guests.placeholders.taxId')}
                    className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-purple-900 mb-1">
                    {t('guests.guardian.phone')}
                  </label>
                  <input
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder={t('guests.placeholders.phone')}
                    className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-purple-900 mb-1">
                    {t('guests.guardian.relationship')}
                  </label>
                  <select
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                    className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 bg-white font-medium"
                  >
                    <option value="parent">
                      {t('guests.guardian.relationshipOptions.parent')}
                    </option>
                    <option value="legal_guardian">
                      {t('guests.guardian.relationshipOptions.legal_guardian')}
                    </option>
                    <option value="authorized_adult">
                      {t('guests.guardian.relationshipOptions.authorized_adult')}
                    </option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-purple-950 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasMinorAuthorization}
                  onChange={(e) => setHasMinorAuthorization(e.target.checked)}
                  className="rounded border-purple-300 text-purple-600 focus:ring-purple-600"
                />
                {t('guests.guardian.authorizationCheckbox')}
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
              {t('guests.profession')}
            </label>
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder={t('guests.placeholders.profession')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
            />
          </div>
        </div>

        {/* Section 2: Identification */}
        <div className="p-4 bg-telivity-teal/5 rounded-xl border border-telivity-teal/15 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-telivity-navy uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck size={14} className="text-telivity-teal" />
              {isBR
                ? t('guests.sections.identificationFnrh')
                : '2. Identity Document & Aadhaar Verification'}
            </h3>
            {idType === 'aadhaar' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-md">
                <CheckCircle2 size={12} className="text-emerald-700" /> UIDAI Certified
              </span>
            )}
          </div>

          {/* Fast Document Type Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setIdType('aadhaar');
                setIdCountry('IN');
                setCountryCode('IN');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                idType === 'aadhaar'
                  ? 'bg-telivity-teal text-white border-telivity-teal shadow-xs'
                  : 'bg-white text-telivity-navy border-gray-200 hover:bg-teal-50'
              }`}
            >
              <span>🪪 Aadhaar Card (UIDAI)</span>
              {idType === 'aadhaar' && <Check size={12} />}
            </button>
            <button
              type="button"
              onClick={() => setIdType('passport')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                idType === 'passport'
                  ? 'bg-telivity-teal text-white border-telivity-teal shadow-xs'
                  : 'bg-white text-telivity-navy border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>🛂 Passport</span>
              {idType === 'passport' && <Check size={12} />}
            </button>
            <button
              type="button"
              onClick={() => setIdType('drivers_license')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                idType === 'drivers_license'
                  ? 'bg-telivity-teal text-white border-telivity-teal shadow-xs'
                  : 'bg-white text-telivity-navy border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>🚗 Driving License</span>
              {idType === 'drivers_license' && <Check size={12} />}
            </button>
            <button
              type="button"
              onClick={() => setIdType('voter_id')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                idType === 'voter_id'
                  ? 'bg-telivity-teal text-white border-telivity-teal shadow-xs'
                  : 'bg-white text-telivity-navy border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>🗳️ Voter ID</span>
              {idType === 'voter_id' && <Check size={12} />}
            </button>
            <button
              type="button"
              onClick={() => setIdType('pan_card')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                idType === 'pan_card'
                  ? 'bg-telivity-teal text-white border-telivity-teal shadow-xs'
                  : 'bg-white text-telivity-navy border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>📄 PAN Card</span>
              {idType === 'pan_card' && <Check size={12} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">
                {t('guests.labels.idType')} *
              </label>
              <select
                value={idType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setIdType(newType);
                  if (newType === 'cpf' && !taxId && idNumber) {
                    setTaxId(idNumber);
                  }
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white font-medium"
              >
                <option value="aadhaar">Aadhaar Card (UIDAI 12-digit)</option>
                <option value="passport">{t('frontDesk.passport')}</option>
                <option value="drivers_license">
                  {t('frontDesk.driversLicense')}
                </option>
                <option value="voter_id">Voter ID (Election Commission)</option>
                <option value="pan_card">PAN Card (Income Tax)</option>
                <option value="national_id">{t('frontDesk.nationalId')}</option>
                {isBR && (
                  <option value="cpf">{t('guests.idTypeOptions.cpf')}</option>
                )}
                {isBR && (
                  <option value="rg">{t('guests.idTypeOptions.rg')}</option>
                )}
                {!isBR && (
                  <option value="tax_id">{t('guests.labels.taxId')}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">
                {idType === 'aadhaar'
                  ? 'Aadhaar Card Number (12 digits)'
                  : idType === 'cpf'
                    ? 'CPF'
                    : idType === 'rg'
                      ? 'RG'
                      : idType === 'passport'
                        ? t('frontDesk.passport')
                        : idType === 'drivers_license'
                          ? t('frontDesk.driversLicense')
                          : idType === 'voter_id'
                            ? 'Voter ID (EPIC)'
                            : idType === 'pan_card'
                              ? 'PAN Card'
                              : t('guests.labels.taxId')}{' '}
                *
              </label>
              <input
                type="text"
                value={idType === 'cpf' ? taxId : idNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  if (idType === 'cpf') {
                    setTaxId(val);
                    setIdNumber(val);
                  } else {
                    setIdNumber(val);
                  }
                }}
                placeholder={
                  idType === 'aadhaar'
                    ? 'e.g. 7823 4512 9012'
                    : idType === 'cpf'
                      ? '000.000.000-00'
                      : idType === 'rg'
                        ? '00.000.000-0'
                        : idType === 'passport'
                          ? 'A12345678'
                          : idType === 'drivers_license'
                            ? 'e.g. TS02 20220001234'
                            : idType === 'voter_id'
                              ? 'e.g. ABC1234567'
                              : idType === 'pan_card'
                                ? 'ABCDE1234F'
                                : t('guests.placeholders.taxId')
                }
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white font-medium ${
                  idType === 'cpf' && taxId && !isCpfValid
                    ? 'border-amber-300'
                    : 'border-gray-200'
                }`}
              />
              {idType === 'aadhaar' && idNumber && (
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Lock size={11} className="text-emerald-600" />
                  <span>Masked for Privacy: <strong>{maskAadhaar(idNumber)}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.labels.idCountry')}
              </label>
              <input
                type="text"
                maxLength={2}
                value={idCountry}
                onChange={(e) => setIdCountry(e.target.value.toUpperCase())}
                placeholder={defaultCountry}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:border-telivity-teal bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.labels.idExpiry')}
              </label>
              <input
                type="date"
                value={idExpiry}
                onChange={(e) => setIdExpiry(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white font-medium"
              />
            </div>
          </div>

          {/* AADHAAR CARD / ID PROOF UPLOAD (FRONT & BACK) */}
          <div className="pt-3 border-t border-telivity-teal/15 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-bold text-telivity-navy">
                  {idType === 'aadhaar'
                    ? 'Aadhaar Card Upload (Front & Back Required)'
                    : 'ID Document Upload (Front & Back)'}
                </label>
                {(idProofFrontUrl || idProofBackUrl) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    <CheckCircle2 size={13} />
                    {idProofFrontUrl && idProofBackUrl ? 'Both Sides Attached' : '1 Side Attached'}
                  </span>
                )}
              </div>

              {/* Sample Aadhaar Auto-Fill and Preview Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadDemoAadhaar}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg transition shadow-2xs"
                  title="Populate official demo Aadhaar Card images for instant testing"
                >
                  <Sparkles size={12} className="text-amber-600" />
                  <span>✨ Use Sample Aadhaar Card</span>
                </button>
                {(idProofFrontUrl || idProofBackUrl) && (
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-telivity-teal hover:bg-telivity-light-teal text-white rounded-lg transition shadow-2xs"
                  >
                    <Eye size={12} />
                    <span>👁️ View & Zoom</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Front Side Upload */}
              <div className="border-2 border-dashed border-teal-200 hover:border-telivity-teal rounded-xl p-3 bg-white transition text-center relative group">
                {idProofFrontUrl ? (
                  <div className="relative">
                    <img
                      src={idProofFrontUrl}
                      alt="ID Proof Front"
                      onClick={() => setViewerOpen(true)}
                      className="h-28 w-full object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition"
                      title="Click to zoom and view full Aadhaar"
                    />
                    <button
                      type="button"
                      onClick={() => setIdProofFrontUrl('')}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition"
                      title="Remove front image"
                    >
                      <X size={12} />
                    </button>
                    <div className="flex items-center justify-between mt-1.5 px-1">
                      <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-600" /> Front Side Uploaded
                      </p>
                      <button
                        type="button"
                        onClick={() => triggerDownload(idProofFrontUrl, `Aadhaar_FRONT_${firstName || 'Guest'}.jpg`)}
                        className="text-[11px] text-telivity-teal hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <Download size={11} /> Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 cursor-pointer group-hover:bg-teal-50/30 rounded-lg transition">
                    <Upload size={22} className="text-telivity-teal mb-1 group-hover:scale-110 transition" />
                    <span className="text-xs font-bold text-telivity-navy">Upload Front Side</span>
                    <span className="text-[10px] text-telivity-mid-grey mt-0.5">Photo & UIDAI Aadhaar Details</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'front')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Back Side Upload */}
              <div className="border-2 border-dashed border-teal-200 hover:border-telivity-teal rounded-xl p-3 bg-white transition text-center relative group">
                {idProofBackUrl ? (
                  <div className="relative">
                    <img
                      src={idProofBackUrl}
                      alt="ID Proof Back"
                      onClick={() => setViewerOpen(true)}
                      className="h-28 w-full object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition"
                      title="Click to zoom and view full Aadhaar"
                    />
                    <button
                      type="button"
                      onClick={() => setIdProofBackUrl('')}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition"
                      title="Remove back image"
                    >
                      <X size={12} />
                    </button>
                    <div className="flex items-center justify-between mt-1.5 px-1">
                      <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-600" /> Back Side Uploaded
                      </p>
                      <button
                        type="button"
                        onClick={() => triggerDownload(idProofBackUrl, `Aadhaar_BACK_${firstName || 'Guest'}.jpg`)}
                        className="text-[11px] text-telivity-teal hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <Download size={11} /> Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 cursor-pointer group-hover:bg-teal-50/30 rounded-lg transition">
                    <Upload size={22} className="text-telivity-teal mb-1 group-hover:scale-110 transition" />
                    <span className="text-xs font-bold text-telivity-navy">Upload Back Side</span>
                    <span className="text-[10px] text-telivity-mid-grey mt-0.5">Address & UIDAI QR Code</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'back')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <p className="text-[10px] text-telivity-mid-grey italic">
              * Upload clear photo or scan of Aadhaar card front & back. ID proofs are encrypted and restricted to hotel front desk staff for guest verification.
            </p>
          </div>
        </div>

        {/* Section 3: Complete Address */}
        <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold text-telivity-navy uppercase tracking-wider">
            {t('guests.sections.address')}
          </h3>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
              {t('guests.labels.addressLine1')}
            </label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder={`Ex: ${t('guests.placeholders.address')}`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
            />
          </div>

          <div
            className={`grid ${isBR ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}
          >
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.labels.addressLine2')}
              </label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder={t('guests.placeholders.addressLine2')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              />
            </div>
            {isBR && (
              <div>
                <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                  {t('guests.neighborhood')}
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder={t('guests.placeholders.neighborhood')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.labels.city')}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('guests.placeholders.city')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.labels.state')}
              </label>
              <input
                type="text"
                maxLength={isBR ? 2 : 50}
                value={stateProvince}
                onChange={(e) =>
                  setStateProvince(
                    isBR ? e.target.value.toUpperCase() : e.target.value
                  )
                }
                placeholder={t('guests.placeholders.state')}
                className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white ${isBR ? 'uppercase' : ''
                  }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.labels.postalCode')}
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder={t('guests.placeholders.postalCode')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
              {t('guests.labels.countryCode')}
            </label>
            <input
              type="text"
              maxLength={2}
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder={defaultCountry}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:border-telivity-teal bg-white"
            />
          </div>
        </div>

        {/* Section 4: Preferences, VIP & Governance */}
        <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold text-telivity-navy uppercase tracking-wider">
            {t('guests.sections.preferences')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.vipLevel')}
              </label>
              <select
                value={vipLevel}
                onChange={(e) => setVipLevel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              >
                <option value="none">{t('guests.none')}</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
                {t('guests.loyaltyNumber')}
              </label>
              <input
                type="text"
                value={loyaltyNumber}
                onChange={(e) => setLoyaltyNumber(e.target.value)}
                placeholder="HAIP-1234"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
              {t('guests.company')}
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t('guests.company')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">
              {t('guests.labels.notes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('guests.placeholders.notes')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-telivity-navy pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={gdprConsentMarketing}
              onChange={(e) => setGdprConsentMarketing(e.target.checked)}
              className="rounded border-gray-300 text-telivity-teal focus:ring-telivity-teal"
            />
            {t('guests.marketingConsent')} (LGPD/GDPR)
          </label>
        </div>

        {isMinor && minorGuardianRequired && (!guardianName || !guardianTaxId) && (
          <p className="text-xs text-purple-700 font-semibold bg-purple-100 p-2.5 rounded-lg border border-purple-200">
            {t('guests.guardian.fillRequiredNotice')}
          </p>
        )}

        <button
          onClick={() => createMutation.mutate()}
          disabled={
            !firstName ||
            !lastName ||
            (isMinor &&
              minorGuardianRequired &&
              (!guardianName || !guardianTaxId)) ||
            createMutation.isPending
          }
          className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-telivity-light-teal disabled:opacity-50 transition-colors"
        >
          {createMutation.isPending
            ? t('common.creating')
            : t('guests.createGuest')}
        </button>
      </div>

      {/* Aadhaar Document Viewer Modal for Inspection & Zoom */}
      <AadhaarViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        guest={{
          firstName: firstName || 'Guest',
          lastName: lastName || 'Profile',
          idProofType: idType === 'aadhaar' ? 'Aadhaar Card' : idType,
          idProofNumber: idNumber || '7823 4512 9012',
          idProofFrontUrl,
          idProofBackUrl,
          idCountry: idCountry || 'IN',
          stateProvince: stateProvince || 'Telangana',
          registrationData: {
            idProofFrontUrl,
            idProofBackUrl,
          },
        }}
        onUpdateGuest={(updated) => {
          if (updated.idProofFrontUrl) setIdProofFrontUrl(updated.idProofFrontUrl);
          if (updated.idProofBackUrl) setIdProofBackUrl(updated.idProofBackUrl);
        }}
      />
    </Modal>
  );
}
