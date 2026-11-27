/**
 * Bangladesh Complete Administrative Geography Generator & Verifier
 * 8 Divisions • 64 Districts • 495 Official Upazilas (Bilingual English + Bangla)
 *
 * Usage:
 *   node scripts/generateBdGeoData.mjs
 *
 * Outputs:
 *   - src/utils/bdGeoData.json
 *   - src/utils/bdGeoData.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const BD_DIVISIONS = [
  { en: 'Dhaka', bn: 'ঢাকা' },
  { en: 'Chattogram', bn: 'চট্টগ্রাম' },
  { en: 'Rajshahi', bn: 'রাজশাহী' },
  { en: 'Khulna', bn: 'খুলনা' },
  { en: 'Barishal', bn: 'বরিশাল' },
  { en: 'Sylhet', bn: 'সিলেট' },
  { en: 'Rangpur', bn: 'রংপুর' },
  { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
];

/**
 * Exhaustive mapping of all 64 Districts and all 495 official Upazilas of Bangladesh
 * Source: Bangladesh National Portal (bangladesh.gov.bd) & BBS Administrative Geography
 */
const RAW_DISTRICTS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DHAKA DIVISION (13 Districts, 89 Upazilas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    district: 'Dhaka',
    districtBn: 'ঢাকা',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.8103,
    lon: 90.4125,
    aliases: ['dacca'],
    marketName: 'Karwan Bazar & Shyambazar Central Terminal',
    marketNameBn: 'কারওয়ান বাজার ও শ্যামবাজার কেন্দ্রীয় মোকাম',
    upazilaList: [
      { en: 'Dhamrai', bn: 'ধামরাই' },
      { en: 'Dohar', bn: 'দোহার' },
      { en: 'Keraniganj', bn: 'কেরাণীগঞ্জ' },
      { en: 'Nawabganj', bn: 'নবাবগঞ্জ' },
      { en: 'Savar', bn: 'সাভার' },
    ],
  },
  {
    district: 'Faridpur',
    districtBn: 'ফরিদপুর',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.6071,
    lon: 89.8429,
    aliases: [],
    marketName: 'Tepakhola Wholesale Arat',
    marketNameBn: 'টেপাখোলা পাইকারি মোকাম',
    upazilaList: [
      { en: 'Alfadanga', bn: 'আলফাডাঙ্গা' },
      { en: 'Bhanga', bn: 'ভাঙ্গা' },
      { en: 'Boalmari', bn: 'বোয়ালমারী' },
      { en: 'Charbhadrasan', bn: 'চরভদ্রাসন' },
      { en: 'Faridpur Sadar', bn: 'ফরিদপুর সদর' },
      { en: 'Madhukhali', bn: 'মধুখালী' },
      { en: 'Nagarkanda', bn: 'নগরকান্দা' },
      { en: 'Sadarpur', bn: 'সদরপুর' },
      { en: 'Saltha', bn: 'সালথা' },
    ],
  },
  {
    district: 'Gazipur',
    districtBn: 'গাজীপুর',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.9999,
    lon: 90.4203,
    aliases: [],
    marketName: 'Joydebpur & Konabari Wholesale Hat',
    marketNameBn: 'জয়দেবপুর ও কোনাবাড়ী পাইকারি মোকাম',
    upazilaList: [
      { en: 'Gazipur Sadar', bn: 'গাজীপুর সদর' },
      { en: 'Kaliakair', bn: 'কালিয়াকৈর' },
      { en: 'Kaliganj', bn: 'কালীগঞ্জ' },
      { en: 'Kapasia', bn: 'কাপাসিয়া' },
      { en: 'Sreepur', bn: 'শ্রীপুর' },
    ],
  },
  {
    district: 'Gopalganj',
    districtBn: 'গোপালগঞ্জ',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.0051,
    lon: 89.8266,
    aliases: [],
    marketName: 'Gopalganj Poura Wholesale Arat',
    marketNameBn: 'গোপালগঞ্জ পৌর পাইকারি মোকাম',
    upazilaList: [
      { en: 'Gopalganj Sadar', bn: 'গোপালগঞ্জ সদর' },
      { en: 'Kashiani', bn: 'কাশিয়ানী' },
      { en: 'Kotalipara', bn: 'কোটালীপাড়া' },
      { en: 'Muksudpur', bn: 'মুকসুদপুর' },
      { en: 'Tungipara', bn: 'টুঙ্গিপাড়া' },
    ],
  },
  {
    district: 'Kishoreganj',
    districtBn: 'কিশোরগঞ্জ',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 24.4449,
    lon: 90.7766,
    aliases: ['kishorganj'],
    marketName: 'Bhairab Wholesale Agro River Port',
    marketNameBn: 'ভৈরব নদী বন্দর পাইকারি মোকাম',
    upazilaList: [
      { en: 'Austagram', bn: 'অষ্টগ্রাম' },
      { en: 'Bajitpur', bn: 'বাজিতপুর' },
      { en: 'Bhairab', bn: 'ভৈরব' },
      { en: 'Hossainpur', bn: 'হোসেনপুর' },
      { en: 'Itna', bn: 'ইটনা' },
      { en: 'Karimganj', bn: 'করিমগঞ্জ' },
      { en: 'Katiadi', bn: 'কটিয়াদী' },
      { en: 'Kishoreganj Sadar', bn: 'কিশোরগঞ্জ সদর' },
      { en: 'Kuliarchar', bn: 'কুলিয়ারচর' },
      { en: 'Mithamain', bn: 'মিঠামইন' },
      { en: 'Nikli', bn: 'নিকলী' },
      { en: 'Pakundia', bn: 'পাকুন্দিয়া' },
      { en: 'Tarail', bn: 'তাড়াইল' },
    ],
  },
  {
    district: 'Madaripur',
    districtBn: 'মাদারীপুর',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.1641,
    lon: 90.1897,
    aliases: [],
    marketName: 'Puranbazar Wholesale Arat',
    marketNameBn: 'পুরাণবাজার পাইকারি মোকাম',
    upazilaList: [
      { en: 'Dasar', bn: 'ডাসার' },
      { en: 'Kalkini', bn: 'কালকিনি' },
      { en: 'Madaripur Sadar', bn: 'মাদারীপুর সদর' },
      { en: 'Rajoir', bn: 'রাজৈর' },
      { en: 'Shibchar', bn: 'শিবচর' },
    ],
  },
  {
    district: 'Manikganj',
    districtBn: 'মানিকগঞ্জ',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.8644,
    lon: 90.0047,
    aliases: [],
    marketName: 'Manikganj Sadar & Singair Arat',
    marketNameBn: 'মানিকগঞ্জ সদর ও সিংগাইর পাইকারি মোকাম',
    upazilaList: [
      { en: 'Daulatpur', bn: 'দৌলতপুর' },
      { en: 'Ghior', bn: 'ঘিওর' },
      { en: 'Harirampur', bn: 'হরিরামপুর' },
      { en: 'Manikganj Sadar', bn: 'মানিকগঞ্জ সদর' },
      { en: 'Saturia', bn: 'সাটুরিয়া' },
      { en: 'Shivalaya', bn: 'শিবালয়' },
      { en: 'Singair', bn: 'সিংগাইর' },
    ],
  },
  {
    district: 'Munshiganj',
    districtBn: 'মুন্সীগঞ্জ',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.5422,
    lon: 90.5305,
    aliases: ['munshigonj'],
    marketName: 'Mirkadim Wholesale Agro Port',
    marketNameBn: 'মিরকাদিম পাইকারি কৃষি মোকাম',
    upazilaList: [
      { en: 'Gazaria', bn: 'গজারিয়া' },
      { en: 'Lohajang', bn: 'লৌহজং' },
      { en: 'Munshiganj Sadar', bn: 'মুন্সীগঞ্জ সদর' },
      { en: 'Sirajdikhan', bn: 'সিরাজদিখান' },
      { en: 'Sreenagar', bn: 'শ্রীনগর' },
      { en: 'Tongibari', bn: 'টঙ্গীবাড়ী' },
    ],
  },
  {
    district: 'Narayanganj',
    districtBn: 'নারায়ণগঞ্জ',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.6337,
    lon: 90.4965,
    aliases: ['নারায়ণগঞ্জ', 'নারায়নগঞ্জ'],
    marketName: 'Nitaiganj Wholesale Arat',
    marketNameBn: 'নিতাইগঞ্জ পাইকারি আড়ত',
    upazilaList: [
      { en: 'Araihazar', bn: 'আড়াইহাজার' },
      { en: 'Bandar', bn: 'বন্দর' },
      { en: 'Narayanganj Sadar', bn: 'নারায়ণগঞ্জ সদর' },
      { en: 'Rupganj', bn: 'রূপগঞ্জ' },
      { en: 'Sonargaon', bn: 'সোনারগাঁও' },
    ],
  },
  {
    district: 'Narsingdi',
    districtBn: 'নরসিংদী',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.9322,
    lon: 90.7154,
    aliases: ['narshingdi'],
    marketName: 'Velanagar & Belabo Wholesale Hat',
    marketNameBn: 'ভেলানগর ও বেলাবো পাইকারি মোকাম',
    upazilaList: [
      { en: 'Belabo', bn: 'বেলাবো' },
      { en: 'Monohardi', bn: 'মনোহরদী' },
      { en: 'Narsingdi Sadar', bn: 'নরসিংদী সদর' },
      { en: 'Palash', bn: 'পলাশ' },
      { en: 'Raipura', bn: 'রায়পুরা' },
      { en: 'Shibpur', bn: 'শিবপুর' },
    ],
  },
  {
    district: 'Rajbari',
    districtBn: 'রাজবাড়ী',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.7574,
    lon: 89.6445,
    aliases: ['রাজবাড়ী', 'রাজবাড়ি'],
    marketName: 'Rajbari Central Wholesale Hat',
    marketNameBn: 'রাজবাড়ী কেন্দ্রীয় পাইকারি মোকাম',
    upazilaList: [
      { en: 'Baliakandi', bn: 'বালিয়াকান্দি' },
      { en: 'Goalandaghat', bn: 'গোয়ালন্দ' },
      { en: 'Kalukhali', bn: 'কালুখালী' },
      { en: 'Pangsha', bn: 'পাংশা' },
      { en: 'Rajbari Sadar', bn: 'রাজবাড়ী সদর' },
    ],
  },
  {
    district: 'Shariatpur',
    districtBn: 'শরীয়তপুর',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 23.2423,
    lon: 90.3526,
    aliases: ['শরীয়তপুর', 'শরিয়তপুর'],
    marketName: 'Palong & Zajira Wholesale Mandi',
    marketNameBn: 'পালং ও জাজিরা পাইকারি মোকাম',
    upazilaList: [
      { en: 'Bhedarganj', bn: 'ভেদরগঞ্জ' },
      { en: 'Damudya', bn: 'ডামুড্যা' },
      { en: 'Gosairhat', bn: 'গোসাইরহাট' },
      { en: 'Naria', bn: 'নড়িয়া' },
      { en: 'Shariatpur Sadar', bn: 'শরীয়তপুর সদর' },
      { en: 'Zajira', bn: 'জাজিরা' },
    ],
  },
  {
    district: 'Tangail',
    districtBn: 'টাঙ্গাইল',
    division: 'Dhaka',
    divisionBn: 'ঢাকা',
    lat: 24.2513,
    lon: 89.9167,
    aliases: [],
    marketName: 'Park Bazar & Elenga Wholesale Arat',
    marketNameBn: 'পার্ক বাজার ও এলেঙ্গা পাইকারি আড়ত',
    upazilaList: [
      { en: 'Basail', bn: 'বাসাইল' },
      { en: 'Bhuapur', bn: 'ভূঞাপুর' },
      { en: 'Delduar', bn: 'দেলদুয়ার' },
      { en: 'Dhanbari', bn: 'ধনবাড়ী' },
      { en: 'Ghatail', bn: 'ঘাটাইল' },
      { en: 'Gopalpur', bn: 'গোপালপুর' },
      { en: 'Kalihati', bn: 'কালিহাতী' },
      { en: 'Madhupur', bn: 'মধুপুর' },
      { en: 'Mirzapur', bn: 'মির্জাপুর' },
      { en: 'Nagarpur', bn: 'নাগরপুর' },
      { en: 'Sakhipur', bn: 'সখিপুর' },
      { en: 'Tangail Sadar', bn: 'টাঙ্গাইল সদর' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CHATTOGRAM DIVISION (11 Districts, 104 Upazilas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    district: 'Bandarban',
    districtBn: 'বান্দরবান',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 22.1953,
    lon: 92.2184,
    aliases: [],
    marketName: 'Bandarban Hill Agro Mandi',
    marketNameBn: 'বান্দরবান পাহাড়ি কৃষি মোকাম',
    upazilaList: [
      { en: 'Ali Kadam', bn: 'আলীকদম' },
      { en: 'Bandarban Sadar', bn: 'বান্দরবান সদর' },
      { en: 'Lama', bn: 'লামা' },
      { en: 'Naikhongchhari', bn: 'নাইক্ষ্যংছড়ি' },
      { en: 'Rowangchhari', bn: 'রোয়াংছড়ি' },
      { en: 'Ruma', bn: 'রুমা' },
      { en: 'Thanchi', bn: 'থানচি' },
    ],
  },
  {
    district: 'Brahmanbaria',
    districtBn: 'ব্রাহ্মণবাড়িয়া',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 23.9571,
    lon: 91.1119,
    aliases: ['bbaria', 'b.baria', 'ব্রাহ্মণবাড়িয়া'],
    marketName: 'Ashuganj & Ananda Bazar Wholesale Arat',
    marketNameBn: 'আশুগঞ্জ ও আনন্দ বাজার পাইকারি মোকাম',
    upazilaList: [
      { en: 'Akhaura', bn: 'আখাউড়া' },
      { en: 'Ashuganj', bn: 'আশুগঞ্জ' },
      { en: 'Bancharampur', bn: 'বাঞ্ছারামপুর' },
      { en: 'Bijoynagar', bn: 'বিজয়নগর' },
      { en: 'Brahmanbaria Sadar', bn: 'ব্রাহ্মণবাড়িয়া সদর' },
      { en: 'Kasba', bn: 'কসবা' },
      { en: 'Nabinagar', bn: 'নবীনগর' },
      { en: 'Nasirnagar', bn: 'নাসিরনগর' },
      { en: 'Sarail', bn: 'সরাইল' },
    ],
  },
  {
    district: 'Chandpur',
    districtBn: 'চাঁদপুর',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 23.2333,
    lon: 90.6667,
    aliases: [],
    marketName: 'Puran Bazar River Terminal',
    marketNameBn: 'পুরাণ বাজার নদী বন্দর পাইকারি মোকাম',
    upazilaList: [
      { en: 'Chandpur Sadar', bn: 'চাঁদপুর সদর' },
      { en: 'Faridganj', bn: 'ফরিদগঞ্জ' },
      { en: 'Haimchar', bn: 'হাইমচর' },
      { en: 'Haziganj', bn: 'হাজীগঞ্জ' },
      { en: 'Kachua', bn: 'কচুয়া' },
      { en: 'Matlab Dakshin', bn: 'মতলব দক্ষিণ' },
      { en: 'Matlab Uttar', bn: 'মতলব উত্তর' },
      { en: 'Shahrasti', bn: 'শাহরাস্তি' },
    ],
  },
  {
    district: 'Chattogram',
    districtBn: 'চট্টগ্রাম',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 22.3569,
    lon: 91.7832,
    aliases: ['chittagong', 'ctg'],
    marketName: 'Reazuddin Bazar & Khatunganj Central Arat',
    marketNameBn: 'রেয়াজউদ্দীন বাজার ও খাতুনগঞ্জ পাইকারি আড়ত',
    upazilaList: [
      { en: 'Anwara', bn: 'আনোয়ারা' },
      { en: 'Banshkhali', bn: 'বাঁশখালী' },
      { en: 'Boalkhali', bn: 'বোয়ালখালী' },
      { en: 'Chandanaish', bn: 'চন্দনাইশ' },
      { en: 'Fatikchhari', bn: 'ফটিকছড়ি' },
      { en: 'Hathazari', bn: 'হাটহাজারী' },
      { en: 'Karnaphuli', bn: 'কর্ণফুলী' },
      { en: 'Lohagara', bn: 'লোহাগাড়া' },
      { en: 'Mirsharai', bn: 'মীরসরাই' },
      { en: 'Patiya', bn: 'পটিয়া' },
      { en: 'Rangunia', bn: 'রাঙ্গুনিয়া' },
      { en: 'Raozan', bn: 'রাউজান' },
      { en: 'Sandwip', bn: 'সন্দ্বীপ' },
      { en: 'Satkania', bn: 'সাতকানিয়া' },
      { en: 'Sitakunda', bn: 'সীতাকুণ্ড' },
    ],
  },
  {
    district: "Cox's Bazar",
    districtBn: 'কক্সবাজার',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 21.4272,
    lon: 92.0058,
    aliases: ['coxsbazar', 'coxs bazar'],
    marketName: 'Bazarghata & Chakaria Wholesale Arat',
    marketNameBn: 'বাজারঘাটা ও চকরিয়া পাইকারি মোকাম',
    upazilaList: [
      { en: 'Chakaria', bn: 'চকরিয়া' },
      { en: "Cox's Bazar Sadar", bn: 'কক্সবাজার সদর' },
      { en: 'Eidgaon', bn: 'ঈদগাঁও' },
      { en: 'Kutubdia', bn: 'কুতুবদিয়া' },
      { en: 'Maheshkhali', bn: 'মহেশখালী' },
      { en: 'Pekua', bn: 'পেকুয়া' },
      { en: 'Ramu', bn: 'রামু' },
      { en: 'Teknaf', bn: 'টেকনাফ' },
      { en: 'Ukhiya', bn: 'উখিয়া' },
    ],
  },
  {
    district: 'Cumilla',
    districtBn: 'কুমিল্লা',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 23.4682,
    lon: 91.1788,
    aliases: ['comilla'],
    marketName: 'Nimsar & Chawkbazar Wholesale Mandi',
    marketNameBn: 'নিমসার ও চকবাজার পাইকারি মোকাম',
    upazilaList: [
      { en: 'Barura', bn: 'বরুড়া' },
      { en: 'Brahmanpara', bn: 'ব্রাহ্মণপাড়া' },
      { en: 'Burichang', bn: 'বুড়িচং' },
      { en: 'Chandina', bn: 'চান্দিনা' },
      { en: 'Chauddagram', bn: 'চৌদ্দগ্রাম' },
      { en: 'Cumilla Adarsha Sadar', bn: 'কুমিল্লা আদর্শ সদর' },
      { en: 'Cumilla Sadar Dakshin', bn: 'কুমিল্লা সদর দক্ষিণ' },
      { en: 'Daudkandi', bn: 'দাউদকান্দি' },
      { en: 'Debidwar', bn: 'দেবিদ্বার' },
      { en: 'Homna', bn: 'হোমনা' },
      { en: 'Laksam', bn: 'লাকসাম' },
      { en: 'Lalmai', bn: 'লালমাই' },
      { en: 'Meghna', bn: 'মেঘনা' },
      { en: 'Monohorgonj', bn: 'মনোহরগঞ্জ' },
      { en: 'Muradnagar', bn: 'মুরাদনগর' },
      { en: 'Nangalkot', bn: 'নাঙ্গলকোট' },
      { en: 'Titas', bn: 'তিতাস' },
    ],
  },
  {
    district: 'Feni',
    districtBn: 'ফেনী',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 23.0159,
    lon: 91.3976,
    aliases: [],
    marketName: 'Feni Barobazar Wholesale Arat',
    marketNameBn: 'ফেনী বড়বাজার পাইকারি মোকাম',
    upazilaList: [
      { en: 'Chhagalnaiya', bn: 'ছাগলনাইয়া' },
      { en: 'Daganbhuiyan', bn: 'দাগনভূঞা' },
      { en: 'Feni Sadar', bn: 'ফেনী সদর' },
      { en: 'Fulgazi', bn: 'ফুলগাজী' },
      { en: 'Parshuram', bn: 'পরশুরাম' },
      { en: 'Sonagazi', bn: 'সোনাগাজী' },
    ],
  },
  {
    district: 'Khagrachhari',
    districtBn: 'খাগড়াছড়ি',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 23.1193,
    lon: 91.9847,
    aliases: ['khagrachari', 'খাগড়াছড়ি'],
    marketName: 'Khagrachhari Sadar Hill Hat',
    marketNameBn: 'খাগড়াছড়ি সদর পাহাড়ি হাট',
    upazilaList: [
      { en: 'Dighinala', bn: 'দীঘিনালা' },
      { en: 'Guimara', bn: 'গুইমারা' },
      { en: 'Khagrachhari Sadar', bn: 'খাগড়াছড়ি সদর' },
      { en: 'Lakshmichhari', bn: 'লক্ষ্মীছড়ি' },
      { en: 'Mahalchhari', bn: 'মহালছড়ি' },
      { en: 'Manikchhari', bn: 'মানিকছড়ি' },
      { en: 'Matiranga', bn: 'মাটিরাঙ্গা' },
      { en: 'Panchhari', bn: 'পানছড়ি' },
      { en: 'Ramgarh', bn: 'রামগড়' },
    ],
  },
  {
    district: 'Lakshmipur',
    districtBn: 'লক্ষ্মীপুর',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 22.9425,
    lon: 90.8412,
    aliases: ['laxmipur'],
    marketName: 'Lakshmipur & Raipur Central Mandi',
    marketNameBn: 'লক্ষ্মীপুর ও রায়পুর কেন্দ্রীয় মোকাম',
    upazilaList: [
      { en: 'Kamalnagar', bn: 'কমলনগর' },
      { en: 'Lakshmipur Sadar', bn: 'লক্ষ্মীপুর সদর' },
      { en: 'Raipur', bn: 'রায়পুর' },
      { en: 'Ramganj', bn: 'রামগঞ্জ' },
      { en: 'Ramgati', bn: 'রামগতি' },
    ],
  },
  {
    district: 'Noakhali',
    districtBn: 'নোয়াখালী',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 22.8696,
    lon: 91.0994,
    aliases: ['নোয়াখালী'],
    marketName: 'Maijdee & Chowmuhani Wholesale Mandi',
    marketNameBn: 'মাইজদী ও চৌমুহনী পাইকারি মোকাম',
    upazilaList: [
      { en: 'Begumganj', bn: 'বেগমগঞ্জ' },
      { en: 'Chatkhil', bn: 'চাটখিল' },
      { en: 'Companiganj', bn: 'কোম্পানীগঞ্জ' },
      { en: 'Hatiya', bn: 'হাতিয়া' },
      { en: 'Kabirhat', bn: 'কবিরহাট' },
      { en: 'Noakhali Sadar', bn: 'নোয়াখালী সদর' },
      { en: 'Senbagh', bn: 'সেনবাগ' },
      { en: 'Sonaimuri', bn: 'সোনাইমুড়ী' },
      { en: 'Subarnachar', bn: 'সুবর্ণচর' },
    ],
  },
  {
    district: 'Rangamati',
    districtBn: 'রাঙ্গামাটি',
    division: 'Chattogram',
    divisionBn: 'চট্টগ্রাম',
    lat: 22.7324,
    lon: 92.2985,
    aliases: [],
    marketName: 'Bonorupa & Kaptai Wholesale Market',
    marketNameBn: 'বনরূপা ও কাপ্তাই পাইকারি বাজার',
    upazilaList: [
      { en: 'Bagaichhari', bn: 'বাঘাইছড়ি' },
      { en: 'Barkal', bn: 'বরকল' },
      { en: 'Belaichhari', bn: 'বিলাইছড়ি' },
      { en: 'Juraichhari', bn: 'জুরাছড়ি' },
      { en: 'Kaptai', bn: 'কাপ্তাই' },
      { en: 'Kawkhali', bn: 'কাউখালী' },
      { en: 'Langadu', bn: 'লংগদু' },
      { en: 'Naniarchar', bn: 'নানিয়ারচর' },
      { en: 'Rajasthali', bn: 'রাজস্থলী' },
      { en: 'Rangamati Sadar', bn: 'রাঙ্গামাটি সদর' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. RAJSHAHI DIVISION (8 Districts, 67 Upazilas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    district: 'Bogura',
    districtBn: 'বগুড়া',
    division: 'Rajshahi',
    divisionBn: 'রাজশাহী',
    lat: 24.8465,
    lon: 89.3778,
    aliases: ['bogra', 'বগুড়া'],
    marketName: 'Mahasthangarh & Fateh Ali Arat',
    marketNameBn: 'মহাস্থানগড় ও ফতেহ আলী পাইকারি মোকাম',
    upazilaList: [
      { en: 'Adamdighi', bn: 'আদমদীঘি' },
      { en: 'Bogura Sadar', bn: 'বগুড়া সদর' },
      { en: 'Dhunat', bn: 'ধুনট' },
      { en: 'Dupchanchia', bn: 'দুপচাঁচিয়া' },
      { en: 'Gabtali', bn: 'গাবতলী' },
      { en: 'Kahaloo', bn: 'কাহালু' },
      { en: 'Nandigram', bn: 'নন্দীগ্রাম' },
      { en: 'Sariakandi', bn: 'সারিয়াকান্দি' },
      { en: 'Shajahanpur', bn: 'শাজাহানপুর' },
      { en: 'Sherpur', bn: 'শেরপুর' },
      { en: 'Shibganj', bn: 'শিবগঞ্জ' },
      { en: 'Sonatala', bn: 'সোনাতলা' },
    ],
  },
  {
    district: 'Chapainawabganj',
    districtBn: 'চাঁপাইনবাবগঞ্জ',
    division: 'Rajshahi',
    divisionBn: 'রাজশাহী',
    lat: 24.5965,
    lon: 88.2775,
    aliases: ['chapai nawabganj', 'nawabganj'],
    marketName: 'Kansat Mango & Agro Mandi',
    marketNameBn: 'কানসাট আম ও কৃষি পাইকারি মোকাম',
    upazilaList: [
      { en: 'Bholahat', bn: 'ভোলাহাট' },
      { en: 'Chapainawabganj Sadar', bn: 'চাঁপাইনবাবগঞ্জ সদর' },
      { en: 'Gomastapur', bn: 'গোমস্তাপুর' },
      { en: 'Nachole', bn: 'নাচোল' },
      { en: 'Shibganj', bn: 'শিবগঞ্জ' },
    ],
  },
  {
    district: 'Joypurhat',
    districtBn: 'জয়পুরহাট',
    division: 'Rajshahi',
    divisionBn: 'রাজশাহী',
    lat: 25.0947,
    lon: 89.0209,
    aliases: ['jaipurhat', 'জয়পুরহাট'],
    marketName: 'Panchbibi & Kalai Agro Hat',
    marketNameBn: 'পাঁচবিবি ও কালাই কৃষি পাইকারি হাট',
    upazilaList: [
      { en: 'Akkelpur', bn: 'আক্কেলপুর' },
      { en: 'Joypurhat Sadar', bn: 'জয়পুরহাট সদর' },
      { en: 'Kalai', bn: 'কালাই' },
      { en: 'Khetlal', bn: 'ক্ষেতলাল' },
      { en: 'Panchbibi', bn: 'পাঁচবিবি' },
    ],
  },
  {
    district: 'Naogaon',
    districtBn: 'নওগাঁ',
    division: 'Rajshahi',
    divisionBn: 'রাজশাহী',
    lat: 24.7936,
    lon: 88.9318,
    aliases: [],
    marketName: 'Mohadevpur & Sapahar Rice Arat Hub',
    marketNameBn: 'মহাদেবপুর ও সাপাহার ধান-চাল পাইকারি মোকাম',
    upazilaList: [
      { en: 'Atrai', bn: 'আত্রাই' },
      { en: 'Badalgachhi', bn: 'বদলগাছী' },
      { en: 'Dhamoirhat', bn: 'ধামইরহাট' },
      { en: 'Manda', bn: 'মান্দা' },
      { en: 'Mohadevpur', bn: 'মহাদেবপুর' },
      { en: 'Naogaon Sadar', bn: 'নওগাঁ সদর' },
      { en: 'Niamatpur', bn: 'নিয়ামতপুর' },
      { en: 'Patnitala', bn: 'পত্নীতলা' },
      { en: 'Porsha', bn: 'পোরশা' },
      { en: 'Raninagar', bn: 'রাণীনগর' },
      { en: 'Sapahar', bn: 'সাপাহার' },
    ],
  },
  {
    district: 'Natore',
    districtBn: 'নাটোর',
    division: 'Rajshahi',
    divisionBn: 'রাজশাহী',
    lat: 24.4206,
    lon: 89.0003,
    aliases: [],
    marketName: 'Chanchkoir & Bonpara Wholesale Mandi',
    marketNameBn: 'চাঁচকৈড় ও বনপাড়া পাইকারি মোকাম',
    upazilaList: [
      { en: 'Bagatipara', bn: 'বাগাতিপাড়া' },
      { en: 'Baraigram', bn: 'বড়াইগ্রাম' },
      { en: 'Gurudaspur', bn: 'গুরুদাসপুর' },
      { en: 'Lalpur', bn: 'লালপুর' },
      { en: 'Naldanga', bn: 'নলডাঙ্গা' },
      { en: 'Natore Sadar', bn: 'নাটোর সদর' },
      { en: 'Singra', bn: 'সিংড়া' },
    ],
  },
  {
    district: 'Pabna',
    districtBn: 'পাবনা',
    division: 'Rajshahi',
    divisionBn: 'রাজশাহী',
    lat: 24.0064,
    lon: 89.2372,
    aliases: [],
    marketName: 'Kashinathpur & Ishwardi Agro Hat',
    marketNameBn: 'কাশীনাথপুর ও ঈশ্বরদী পাইকারি মোকাম',
    upazilaList: [
      { en: 'Atgharia', bn: 'আটঘরিয়া' },
      { en: 'Bera', bn: 'বেড়া' },
      { en: 'Bhangura', bn: 'ভাঙ্গুড়া' },
      { en: 'Chatmohar', bn: 'চাটমোহর' },
      { en: 'Faridpur', bn: 'ফরিদপুর' },
      { en: 'Ishwardi', bn: 'ঈশ্বরদী' },
      { en: 'Pabna Sadar', bn: 'পাবনা সদর' },
      { en: 'Santhia', bn: 'সাঁথিয়া' },
      { en: 'Sujanagar', bn: 'সুজানগর' },
    ],
  },
  {
    district: 'Rajshahi',
    districtBn: 'রাজশাহী',
    division: 'Rajshahi',
    divisionBn: 'রাজশাহী',
    lat: 24.3745,
    lon: 88.6042,
    aliases: [],
    marketName: 'Baneswar Wholesale Agro Hat & Shaheb Bazar',
    marketNameBn: 'বানেশ্বর পাইকারি হাট ও সাহেব বাজার',
    upazilaList: [
      { en: 'Bagha', bn: 'বাঘা' },
      { en: 'Bagmara', bn: 'বাগমারা' },
      { en: 'Charghat', bn: 'চারঘাট' },
      { en: 'Durgapur', bn: 'দুর্গাপুর' },
      { en: 'Godagari', bn: 'গোদাগাড়ী' },
      { en: 'Mohanpur', bn: 'মোহনপুর' },
      { en: 'Paba', bn: 'পবা' },
      { en: 'Puthia', bn: 'পুঠিয়া' },
      { en: 'Tanore', bn: 'তানোর' },
    ],
  },
  {
    district: 'Sirajganj',
    districtBn: 'সিরাজগঞ্জ',
    division: 'Rajshahi',
    divisionBn: 'রাজশাহী',
    lat: 24.4534,
    lon: 89.7006,
    aliases: ['sirajgonj'],
    marketName: 'Ullahpara & Hatikumrul Grain Mandi',
    marketNameBn: 'উল্লাপাড়া ও হাটিকুমরুল শস্য মোকাম',
    upazilaList: [
      { en: 'Belkuchi', bn: 'বেলকুচি' },
      { en: 'Chauhali', bn: 'চৌহালী' },
      { en: 'Kamarkhanda', bn: 'কামারখন্দ' },
      { en: 'Kazipur', bn: 'কাজীপুর' },
      { en: 'Raiganj', bn: 'রায়গঞ্জ' },
      { en: 'Shahjadpur', bn: 'শাহজাদপুর' },
      { en: 'Sirajganj Sadar', bn: 'সিরাজগঞ্জ সদর' },
      { en: 'Tarash', bn: 'তাড়াশ' },
      { en: 'Ullahpara', bn: 'উল্লাপাড়া' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. KHULNA DIVISION (10 Districts, 59 Upazilas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    district: 'Bagerhat',
    districtBn: 'বাগেরহাট',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 22.6516,
    lon: 89.7859,
    aliases: [],
    marketName: 'Bagerhat & Fakirhat Central Agro Hat',
    marketNameBn: 'বাগেরহাট ও ফকিরহাট কেন্দ্রীয় মোকাম',
    upazilaList: [
      { en: 'Bagerhat Sadar', bn: 'বাগেরহাট সদর' },
      { en: 'Chitalmari', bn: 'চিতলমারী' },
      { en: 'Fakirhat', bn: 'ফকিরহাট' },
      { en: 'Kachua', bn: 'কচুয়া' },
      { en: 'Mollahat', bn: 'মোল্লাহাট' },
      { en: 'Mongla', bn: 'মোংলা' },
      { en: 'Morrelganj', bn: 'মোড়েলগঞ্জ' },
      { en: 'Rampal', bn: 'রামপাল' },
      { en: 'Sarankhola', bn: 'শরণখোলা' },
    ],
  },
  {
    district: 'Chuadanga',
    districtBn: 'চুয়াডাঙ্গা',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 23.6402,
    lon: 88.8418,
    aliases: ['চুয়াডাঙ্গা'],
    marketName: 'Damurhuda & Alamdanga Wholesale Mandi',
    marketNameBn: 'দামুড়হুদা ও আলমডাঙ্গা পাইকারি মোকাম',
    upazilaList: [
      { en: 'Alamdanga', bn: 'আলমডাঙ্গা' },
      { en: 'Chuadanga Sadar', bn: 'চুয়াডাঙ্গা সদর' },
      { en: 'Damurhuda', bn: 'দামুড়হুদা' },
      { en: 'Jibannagar', bn: 'জীবননগর' },
    ],
  },
  {
    district: 'Jashore',
    districtBn: 'যশোর',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 23.1664,
    lon: 89.2081,
    aliases: ['jessore'],
    marketName: 'Sathmile & Barobazar Wholesale Mandi',
    marketNameBn: 'সাতমাইল ও বড়বাজার পাইকারি মোকাম',
    upazilaList: [
      { en: 'Abhaynagar', bn: 'অভয়নগর' },
      { en: 'Bagherpara', bn: 'বাঘারপাড়া' },
      { en: 'Chaugachha', bn: 'চৌগাছা' },
      { en: 'Jashore Sadar', bn: 'যশোর সদর' },
      { en: 'Jhikargachha', bn: 'ঝিকরগাছা' },
      { en: 'Keshabpur', bn: 'কেশবপুর' },
      { en: 'Manirampur', bn: 'মণিরামপুর' },
      { en: 'Sharsha', bn: 'শার্শা' },
    ],
  },
  {
    district: 'Jhenaidah',
    districtBn: 'ঝিনাইদহ',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 23.5448,
    lon: 89.1539,
    aliases: ['jhenaidaha'],
    marketName: 'Kaliganj & Barobazar Banana & Agro Hat',
    marketNameBn: 'কালীগঞ্জ কলা ও কৃষি পাইকারি মোকাম',
    upazilaList: [
      { en: 'Harinakunda', bn: 'হরিণাকুণ্ডু' },
      { en: 'Jhenaidah Sadar', bn: 'ঝিনাইদহ সদর' },
      { en: 'Kaliganj', bn: 'কালীগঞ্জ' },
      { en: 'Kotchandpur', bn: 'কোটচাঁদপুর' },
      { en: 'Maheshpur', bn: 'মহেশপুর' },
      { en: 'Shailkupa', bn: 'শৈলকুপা' },
    ],
  },
  {
    district: 'Khulna',
    districtBn: 'খুলনা',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 22.8456,
    lon: 89.5403,
    aliases: [],
    marketName: 'Sonadanga & Dumuria Wholesale Market',
    marketNameBn: 'সোনাডাঙ্গা ও ডুমুরিয়া পাইকারি মোকাম',
    upazilaList: [
      { en: 'Batiaghata', bn: 'বটিয়াঘাটা' },
      { en: 'Dacope', bn: 'দাকোপ' },
      { en: 'Dighalia', bn: 'দিঘলিয়া' },
      { en: 'Dumuria', bn: 'ডুমুরিয়া' },
      { en: 'Koyra', bn: 'কয়রা' },
      { en: 'Paikgachha', bn: 'পাইকগাছা' },
      { en: 'Phultala', bn: 'ফুলতলা' },
      { en: 'Rupsha', bn: 'রূপসা' },
      { en: 'Terokhada', bn: 'তেরখাদা' },
    ],
  },
  {
    district: 'Kushtia',
    districtBn: 'কুষ্টিয়া',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 23.9013,
    lon: 89.1205,
    aliases: ['কুষ্টিয়া'],
    marketName: 'Khajanagar Rice & Kushtia Municipal Arat',
    marketNameBn: 'খাজানগর চাল ও পৌর পাইকারি মোকাম',
    upazilaList: [
      { en: 'Bheramara', bn: 'ভেড়ামারা' },
      { en: 'Daulatpur', bn: 'দৌলতপুর' },
      { en: 'Khoksa', bn: 'খোকসা' },
      { en: 'Kumarkhali', bn: 'কুমারখালী' },
      { en: 'Kushtia Sadar', bn: 'কুষ্টিয়া সদর' },
      { en: 'Mirpur', bn: 'মিরপুর' },
    ],
  },
  {
    district: 'Magura',
    districtBn: 'মাগুরা',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 23.4873,
    lon: 89.4199,
    aliases: [],
    marketName: 'Magura Satdoha & Town Arat',
    marketNameBn: 'মাগুরা সাতদোহা ও টাউন পাইকারি মোকাম',
    upazilaList: [
      { en: 'Magura Sadar', bn: 'মাগুরা সদর' },
      { en: 'Mohammadpur', bn: 'মহম্মদপুর' },
      { en: 'Shalikha', bn: 'শালিখা' },
      { en: 'Sreepur', bn: 'শ্রীপুর' },
    ],
  },
  {
    district: 'Meherpur',
    districtBn: 'মেহেরপুর',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 23.7622,
    lon: 88.6318,
    aliases: [],
    marketName: 'Gangni & Bamundi Wholesale Hat',
    marketNameBn: 'গাংনী ও বামুন্দী পাইকারি হাট',
    upazilaList: [
      { en: 'Gangni', bn: 'গাংনী' },
      { en: 'Meherpur Sadar', bn: 'মেহেরপুর সদর' },
      { en: 'Mujibnagar', bn: 'মুজিবনগর' },
    ],
  },
  {
    district: 'Narail',
    districtBn: 'নড়াইল',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 23.1725,
    lon: 89.5127,
    aliases: ['নড়াইল'],
    marketName: 'Lohagara & Rupganj Agro Mandi',
    marketNameBn: 'লোহাগড়া ও রূপগঞ্জ পাইকারি মোকাম',
    upazilaList: [
      { en: 'Kalia', bn: 'কালিয়া' },
      { en: 'Lohagara', bn: 'লোহাগড়া' },
      { en: 'Narail Sadar', bn: 'নড়াইল সদর' },
    ],
  },
  {
    district: 'Satkhira',
    districtBn: 'সাতক্ষীরা',
    division: 'Khulna',
    divisionBn: 'খুলনা',
    lat: 22.7185,
    lon: 89.0705,
    aliases: [],
    marketName: 'Sultanpur Bazar Wholesale Mandi',
    marketNameBn: 'সুলতানপুর বড়বাজার পাইকারি মোকাম',
    upazilaList: [
      { en: 'Assasuni', bn: 'আশাশুনি' },
      { en: 'Debhata', bn: 'দেবহাটা' },
      { en: 'Kalaroa', bn: 'কলারোয়া' },
      { en: 'Kaliganj', bn: 'কালীগঞ্জ' },
      { en: 'Satkhira Sadar', bn: 'সাতক্ষীরা সদর' },
      { en: 'Shyamnagar', bn: 'শ্যামনগর' },
      { en: 'Tala', bn: 'তালা' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. BARISHAL DIVISION (6 Districts, 42 Upazilas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    district: 'Barguna',
    districtBn: 'বরগুনা',
    division: 'Barishal',
    divisionBn: 'বরিশাল',
    lat: 22.0953,
    lon: 90.1121,
    aliases: [],
    marketName: 'Barguna Poura & Amtali Mandi',
    marketNameBn: 'বরগুনা পৌর ও আমতলী পাইকারি মোকাম',
    upazilaList: [
      { en: 'Amtali', bn: 'আমতলী' },
      { en: 'Bamna', bn: 'বামনা' },
      { en: 'Barguna Sadar', bn: 'বরগুনা সদর' },
      { en: 'Betagi', bn: 'বেতাগী' },
      { en: 'Patharghata', bn: 'পাথরঘাটা' },
      { en: 'Taltali', bn: 'তালতলী' },
    ],
  },
  {
    district: 'Barishal',
    districtBn: 'বরিশাল',
    division: 'Barishal',
    divisionBn: 'বরিশাল',
    lat: 22.701,
    lon: 90.3535,
    aliases: ['barisal'],
    marketName: 'Port Road & Chawkbazar Wholesale Mandi',
    marketNameBn: 'পোর্ট রোড ও চকবাজার পাইকারি মোকাম',
    upazilaList: [
      { en: 'Agailjhara', bn: 'আগৈলঝাড়া' },
      { en: 'Babuganj', bn: 'বাবুগঞ্জ' },
      { en: 'Bakerganj', bn: 'বাকেরগঞ্জ' },
      { en: 'Banaripara', bn: 'বানারীপাড়া' },
      { en: 'Barishal Sadar', bn: 'বরিশাল সদর' },
      { en: 'Gournadi', bn: 'গৌরনদী' },
      { en: 'Hizla', bn: 'হিজলা' },
      { en: 'Mehendiganj', bn: 'মেহেন্দিগঞ্জ' },
      { en: 'Muladi', bn: 'মুলাদী' },
      { en: 'Wazirpur', bn: 'উজিরপুর' },
    ],
  },
  {
    district: 'Bhola',
    districtBn: 'ভোলা',
    division: 'Barishal',
    divisionBn: 'বরিশাল',
    lat: 22.6859,
    lon: 90.6481,
    aliases: [],
    marketName: 'Bhola Natun Bazar & Char Fasson Mandi',
    marketNameBn: 'নতুন বাজার ও চরফ্যাশন পাইকারি মোকাম',
    upazilaList: [
      { en: 'Bhola Sadar', bn: 'ভোলা সদর' },
      { en: 'Burhanuddin', bn: 'বোরহানউদ্দিন' },
      { en: 'Char Fasson', bn: 'চরফ্যাশন' },
      { en: 'Daulatkhan', bn: 'দৌলতখান' },
      { en: 'Lalmohan', bn: 'লালমোহন' },
      { en: 'Manpura', bn: 'মনপুরা' },
      { en: 'Tazumuddin', bn: 'তজুমদ্দিন' },
    ],
  },
  {
    district: 'Jhalokathi',
    districtBn: 'ঝালকাঠি',
    division: 'Barishal',
    divisionBn: 'বরিশাল',
    lat: 22.6406,
    lon: 90.1987,
    aliases: ['jhalokati', 'jhalakathi', 'jhalakati'],
    marketName: 'Bhimruli Floating & Jhalokathi Arat',
    marketNameBn: 'ভীমরুলি ভাসমান হাট ও ঝালকাঠি মোকাম',
    upazilaList: [
      { en: 'Jhalokathi Sadar', bn: 'ঝালকাঠি সদর' },
      { en: 'Kathalia', bn: 'কাঁঠালিয়া' },
      { en: 'Nalchity', bn: 'নলছিটি' },
      { en: 'Rajapur', bn: 'রাজাপুর' },
    ],
  },
  {
    district: 'Patuakhali',
    districtBn: 'পটুয়াখালী',
    division: 'Barishal',
    divisionBn: 'বরিশাল',
    lat: 22.3596,
    lon: 90.3299,
    aliases: ['পটুয়াখালী'],
    marketName: 'Kalapara & Patuakhali Municipal Mandi',
    marketNameBn: 'কলাপাড়া ও পটুয়াখালী পৌর মোকাম',
    upazilaList: [
      { en: 'Bauphal', bn: 'বাউফল' },
      { en: 'Dashmina', bn: 'দশমিনা' },
      { en: 'Dumki', bn: 'দুমকি' },
      { en: 'Galachipa', bn: 'গলাচিপা' },
      { en: 'Kalapara', bn: 'কলাপাড়া' },
      { en: 'Mirzaganj', bn: 'মির্জাগঞ্জ' },
      { en: 'Patuakhali Sadar', bn: 'পটুয়াখালী সদর' },
      { en: 'Rangabali', bn: 'রাঙ্গাবালী' },
    ],
  },
  {
    district: 'Pirojpur',
    districtBn: 'পিরোজপুর',
    division: 'Barishal',
    divisionBn: 'বরিশাল',
    lat: 22.5841,
    lon: 89.972,
    aliases: [],
    marketName: 'Nesarabad & Bhandaria River Mandi',
    marketNameBn: 'নেছারাবাদ ও ভাণ্ডারিয়া নদী মোকাম',
    upazilaList: [
      { en: 'Bhandaria', bn: 'ভাণ্ডারিয়া' },
      { en: 'Indurkani', bn: 'ইন্দুরকানী' },
      { en: 'Kawkhali', bn: 'কাউখালী' },
      { en: 'Mathbaria', bn: 'মঠবাড়িয়া' },
      { en: 'Nazirpur', bn: 'নাজিরপুর' },
      { en: 'Nesarabad', bn: 'নেছারাবাদ (স্বরূপকাঠি)' },
      { en: 'Pirojpur Sadar', bn: 'পিরোজপুর সদর' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SYLHET DIVISION (4 Districts, 41 Upazilas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    district: 'Habiganj',
    districtBn: 'হবিগঞ্জ',
    division: 'Sylhet',
    divisionBn: 'সিলেট',
    lat: 24.3749,
    lon: 91.4155,
    aliases: ['hobigonj'],
    marketName: 'Shayestaganj & Madhabpur Wholesale Arat',
    marketNameBn: 'শায়েস্তাগঞ্জ ও মাধবপুর পাইকারি মোকাম',
    upazilaList: [
      { en: 'Ajmiriganj', bn: 'আজমিরীগঞ্জ' },
      { en: 'Bahubal', bn: 'বাহুবল' },
      { en: 'Baniachong', bn: 'বানিয়াচং' },
      { en: 'Chunarughat', bn: 'চুনারুঘাট' },
      { en: 'Habiganj Sadar', bn: 'হবিগঞ্জ সদর' },
      { en: 'Lakhai', bn: 'লাখাই' },
      { en: 'Madhabpur', bn: 'মাধবপুর' },
      { en: 'Nabiganj', bn: 'নবীগঞ্জ' },
      { en: 'Shayestaganj', bn: 'শায়েস্তাগঞ্জ' },
    ],
  },
  {
    district: 'Moulvibazar',
    districtBn: 'মৌলভীবাজার',
    division: 'Sylhet',
    divisionBn: 'সিলেট',
    lat: 24.4829,
    lon: 91.7774,
    aliases: ['maulvibazar'],
    marketName: 'Sreemangal & Moulvibazar Mandi',
    marketNameBn: 'শ্রীমঙ্গল ও মৌলভীবাজার পাইকারি মোকাম',
    upazilaList: [
      { en: 'Barlekha', bn: 'বড়লেখা' },
      { en: 'Juri', bn: 'জুড়ী' },
      { en: 'Kamalganj', bn: 'কমলগঞ্জ' },
      { en: 'Kulaura', bn: 'কুলাউড়া' },
      { en: 'Moulvibazar Sadar', bn: 'মৌলভীবাজার সদর' },
      { en: 'Rajnagar', bn: 'রাজনগর' },
      { en: 'Sreemangal', bn: 'শ্রীমঙ্গল' },
    ],
  },
  {
    district: 'Sunamganj',
    districtBn: 'সুনামগঞ্জ',
    division: 'Sylhet',
    divisionBn: 'সিলেট',
    lat: 25.0658,
    lon: 91.395,
    aliases: ['sunamgonj'],
    marketName: 'Chhatak & Sunamganj Haor Arat Hub',
    marketNameBn: 'ছাতক ও সুনামগঞ্জ হাওর পাইকারি মোকাম',
    upazilaList: [
      { en: 'Bishwamvarpur', bn: 'বিশ্বম্ভরপুর' },
      { en: 'Chhatak', bn: 'ছাতক' },
      { en: 'Derai', bn: 'দিরাই' },
      { en: 'Dharmapasha', bn: 'ধর্মপাশা' },
      { en: 'Dowarabazar', bn: 'দোয়ারাবাজার' },
      { en: 'Jagannathpur', bn: 'জগন্নাথপুর' },
      { en: 'Jamalganj', bn: 'জামালগঞ্জ' },
      { en: 'Madhyanagar', bn: 'মধ্যনগর' },
      { en: 'Shantiganj', bn: 'শান্তিগঞ্জ' },
      { en: 'Sullah', bn: 'শাল্লা' },
      { en: 'Sunamganj Sadar', bn: 'সুনামগঞ্জ সদর' },
      { en: 'Tahirpur', bn: 'তাহিরপুর' },
    ],
  },
  {
    district: 'Sylhet',
    districtBn: 'সিলেট',
    division: 'Sylhet',
    divisionBn: 'সিলেট',
    lat: 24.8949,
    lon: 91.8687,
    aliases: [],
    marketName: 'Subidbazar & Kadamtali Wholesale Mandi',
    marketNameBn: 'সুবিদবাজার ও কদমতলী পাইকারি মোকাম',
    upazilaList: [
      { en: 'Balaganj', bn: 'বালাগঞ্জ' },
      { en: 'Beanibazar', bn: 'বিয়ানীবাজার' },
      { en: 'Bishwanath', bn: 'বিশ্বনাথ' },
      { en: 'Companiganj', bn: 'কোম্পানীগঞ্জ' },
      { en: 'Dakshin Surma', bn: 'দক্ষিণ সুরমা' },
      { en: 'Fenchuganj', bn: 'ফেঞ্চুগঞ্জ' },
      { en: 'Golapganj', bn: 'গোলাপগঞ্জ' },
      { en: 'Gowainghat', bn: 'গোয়াইনঘাট' },
      { en: 'Jaintiapur', bn: 'জৈন্তাপুর' },
      { en: 'Kanaighat', bn: 'কানাইঘাট' },
      { en: 'Osmani Nagar', bn: 'ওসমানীনগর' },
      { en: 'Sylhet Sadar', bn: 'সিলেট সদর' },
      { en: 'Zakiganj', bn: 'জকিগঞ্জ' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. RANGPUR DIVISION (8 Districts, 58 Upazilas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    district: 'Dinajpur',
    districtBn: 'দিনাজপুর',
    division: 'Rangpur',
    divisionBn: 'রংপুর',
    lat: 25.6217,
    lon: 88.6355,
    aliases: [],
    marketName: 'Bahadurbazar & Pulhat Wholesale Arat',
    marketNameBn: 'বাহাদুরবাজার ও পুলহাট পাইকারি আড়ত',
    upazilaList: [
      { en: 'Birampur', bn: 'বিরামপুর' },
      { en: 'Biral', bn: 'বিরল' },
      { en: 'Birganj', bn: 'বীরগঞ্জ' },
      { en: 'Bochaganj', bn: 'বোচাগঞ্জ' },
      { en: 'Chirirbandar', bn: 'চিরিরবন্দর' },
      { en: 'Dinajpur Sadar', bn: 'দিনাজপুর সদর' },
      { en: 'Ghoraghat', bn: 'ঘোড়াঘাট' },
      { en: 'Hakimpur', bn: 'হাকিমপুর' },
      { en: 'Kaharole', bn: 'কাহারোল' },
      { en: 'Khansama', bn: 'খানসামা' },
      { en: 'Nawabganj', bn: 'নবাবগঞ্জ' },
      { en: 'Parbatipur', bn: 'পার্বতীপুর' },
      { en: 'Phulbari', bn: 'ফুলবাড়ী' },
    ],
  },
  {
    district: 'Gaibandha',
    districtBn: 'গাইবান্ধা',
    division: 'Rangpur',
    divisionBn: 'রংপুর',
    lat: 25.3288,
    lon: 89.543,
    aliases: [],
    marketName: 'Gobindaganj & Palashbari Agro Wholesale Hat',
    marketNameBn: 'গোবিন্দগঞ্জ ও পলাশবাড়ী কৃষি পাইকারি মোকাম',
    upazilaList: [
      { en: 'Fulchhari', bn: 'ফুলছড়ি' },
      { en: 'Gaibandha Sadar', bn: 'গাইবান্ধা সদর' },
      { en: 'Gobindaganj', bn: 'গোবিন্দগঞ্জ' },
      { en: 'Palashbari', bn: 'পলাশবাড়ী' },
      { en: 'Sadullapur', bn: 'সাদুল্লাপুর' },
      { en: 'Saghata', bn: 'সাঘাটা' },
      { en: 'Sundarganj', bn: 'সুন্দরগঞ্জ' },
    ],
  },
  {
    district: 'Kurigram',
    districtBn: 'কুড়িগ্রাম',
    division: 'Rangpur',
    divisionBn: 'রংপুর',
    lat: 25.8054,
    lon: 89.6362,
    aliases: ['কুড়িগ্রাম'],
    marketName: 'Nageshwari & Kurigram Municipal Hat',
    marketNameBn: 'নাগেশ্বরী ও কুড়িগ্রাম পৌর পাইকারি মোকাম',
    upazilaList: [
      { en: 'Bhurungamari', bn: 'ভুরুঙ্গামারী' },
      { en: 'Char Rajibpur', bn: 'চর রাজিবপুর' },
      { en: 'Chilmari', bn: 'চিলমারী' },
      { en: 'Kurigram Sadar', bn: 'কুড়িগ্রাম সদর' },
      { en: 'Nageshwari', bn: 'নাগেশ্বরী' },
      { en: 'Phulbari', bn: 'ফুলবাড়ী' },
      { en: 'Rajarhat', bn: 'রাজারহাট' },
      { en: 'Raomari', bn: 'রৌমারী' },
      { en: 'Ulipur', bn: 'উলিপুর' },
    ],
  },
  {
    district: 'Lalmonirhat',
    districtBn: 'লালমনিরহাট',
    division: 'Rangpur',
    divisionBn: 'রংপুর',
    lat: 25.9923,
    lon: 89.2847,
    aliases: [],
    marketName: 'Hatibandha & Patgram Maize Mandi',
    marketNameBn: 'হাতীবান্ধা ও পাটগ্রাম ভুট্টা পাইকারি মোকাম',
    upazilaList: [
      { en: 'Aditmari', bn: 'আদিতমারী' },
      { en: 'Hatibandha', bn: 'হাতীবান্ধা' },
      { en: 'Kaliganj', bn: 'কালীগঞ্জ' },
      { en: 'Lalmonirhat Sadar', bn: 'লালমনিরহাট সদর' },
      { en: 'Patgram', bn: 'পাটগ্রাম' },
    ],
  },
  {
    district: 'Nilphamari',
    districtBn: 'নীলফামারী',
    division: 'Rangpur',
    divisionBn: 'রংপুর',
    lat: 25.9318,
    lon: 88.856,
    aliases: [],
    marketName: 'Saidpur & Jaldhaka Wholesale Mandi',
    marketNameBn: 'সৈয়দপুর ও জলঢাকা পাইকারি মোকাম',
    upazilaList: [
      { en: 'Dimla', bn: 'ডিমলা' },
      { en: 'Domar', bn: 'ডোমার' },
      { en: 'Jaldhaka', bn: 'জলঢাকা' },
      { en: 'Kishoreganj', bn: 'কিশোরগঞ্জ' },
      { en: 'Nilphamari Sadar', bn: 'নীলফামারী সদর' },
      { en: 'Saidpur', bn: 'সৈয়দপুর' },
    ],
  },
  {
    district: 'Panchagarh',
    districtBn: 'পঞ্চগড়',
    division: 'Rangpur',
    divisionBn: 'রংপুর',
    lat: 26.3411,
    lon: 88.5542,
    aliases: ['পঞ্চগড়'],
    marketName: 'Boda & Tetulia Agro Arat',
    marketNameBn: 'বোদা ও তেঁতুলিয়া কৃষি পাইকারি মোকাম',
    upazilaList: [
      { en: 'Atwari', bn: 'আটোয়ারী' },
      { en: 'Boda', bn: 'বোদা' },
      { en: 'Debiganj', bn: 'দেবীগঞ্জ' },
      { en: 'Panchagarh Sadar', bn: 'পঞ্চগড় সদর' },
      { en: 'Tetulia', bn: 'তেঁতুলিয়া' },
    ],
  },
  {
    district: 'Rangpur',
    districtBn: 'রংপুর',
    division: 'Rangpur',
    divisionBn: 'রংপুর',
    lat: 25.7439,
    lon: 89.2752,
    aliases: [],
    marketName: 'Rangpur City Wholesale Arat & Mithapukur Mandi',
    marketNameBn: 'রংপুর সিটি পাইকারি মোকাম ও মিঠাপুকুর হাট',
    upazilaList: [
      { en: 'Badarganj', bn: 'বদরগঞ্জ' },
      { en: 'Gangachara', bn: 'গঙ্গাচড়া' },
      { en: 'Kaunia', bn: 'কাউনিয়া' },
      { en: 'Mithapukur', bn: 'মিঠাপুকুর' },
      { en: 'Pirgachha', bn: 'পীরগাছা' },
      { en: 'Pirganj', bn: 'পীরগঞ্জ' },
      { en: 'Rangpur Sadar', bn: 'রংপুর সদর' },
      { en: 'Taraganj', bn: 'তারাগঞ্জ' },
    ],
  },
  {
    district: 'Thakurgaon',
    districtBn: 'ঠাকুরগাঁও',
    division: 'Rangpur',
    divisionBn: 'রংপুর',
    lat: 26.0337,
    lon: 88.4617,
    aliases: [],
    marketName: 'Thakurgaon Road & Ranisankail Mandi',
    marketNameBn: 'ঠাকুরগাঁও রোড ও রাণীশংকৈল পাইকারি মোকাম',
    upazilaList: [
      { en: 'Baliadangi', bn: 'বালিয়াডাঙ্গী' },
      { en: 'Haripur', bn: 'হরিপুর' },
      { en: 'Pirganj', bn: 'পীরগঞ্জ' },
      { en: 'Ranisankail', bn: 'রাণীশংকৈল' },
      { en: 'Thakurgaon Sadar', bn: 'ঠাকুরগাঁও সদর' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. MYMENSINGH DIVISION (4 Districts, 35 Upazilas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    district: 'Jamalpur',
    districtBn: 'জামালপুর',
    division: 'Mymensingh',
    divisionBn: 'ময়মনসিংহ',
    lat: 24.9375,
    lon: 89.9378,
    aliases: [],
    marketName: 'Nandina & Islampur Agro Mandi',
    marketNameBn: 'নান্দিনা ও ইসলামপুর কৃষি মোকাম',
    upazilaList: [
      { en: 'Bakshiganj', bn: 'বকশীগঞ্জ' },
      { en: 'Dewanganj', bn: 'দেওয়ানগঞ্জ' },
      { en: 'Islampur', bn: 'ইসলামপুর' },
      { en: 'Jamalpur Sadar', bn: 'জামালপুর সদর' },
      { en: 'Madarganj', bn: 'মাদারগঞ্জ' },
      { en: 'Melandaha', bn: 'মেলান্দহ' },
      { en: 'Sarishabari', bn: 'সরিষাবাড়ী' },
    ],
  },
  {
    district: 'Mymensingh',
    districtBn: 'ময়মনসিংহ',
    division: 'Mymensingh',
    divisionBn: 'ময়মনসিংহ',
    lat: 24.7471,
    lon: 90.4203,
    aliases: ['ময়মনসিংহ'],
    marketName: 'Mechua Bazar & Shambhuganj Wholesale Arat',
    marketNameBn: 'মেছুয়া বাজার ও শম্ভুগঞ্জ পাইকারি মোকাম',
    upazilaList: [
      { en: 'Bhaluka', bn: 'ভালুকা' },
      { en: 'Dhobaura', bn: 'ধোবাউড়া' },
      { en: 'Fulbaria', bn: 'ফুলবাড়িয়া' },
      { en: 'Gafargaon', bn: 'গফরগাঁও' },
      { en: 'Gauripur', bn: 'গৌরীপুর' },
      { en: 'Haluaghat', bn: 'হালুয়াঘাট' },
      { en: 'Ishwarganj', bn: 'ঈশ্বরগঞ্জ' },
      { en: 'Muktagachha', bn: 'মুক্তাগাছা' },
      { en: 'Mymensingh Sadar', bn: 'ময়মনসিংহ সদর' },
      { en: 'Nandail', bn: 'নান্দাইল' },
      { en: 'Phulpur', bn: 'ফুলপুর' },
      { en: 'Tara Khanda', bn: 'তারাকান্দা' },
      { en: 'Trishal', bn: 'ত্রিশাল' },
    ],
  },
  {
    district: 'Netrokona',
    districtBn: 'নেত্রকোণা',
    division: 'Mymensingh',
    divisionBn: 'ময়মনসিংহ',
    lat: 24.8709,
    lon: 90.7279,
    aliases: ['netrakona', 'নেত্রকোনা'],
    marketName: 'Mohanganj & ठाकुरাকোনা Haor Mandi'.replace('ठाकुरাকোনা', 'Thakurakona'),
    marketNameBn: 'মোহনগঞ্জ ও ঠাকুরাকোনা হাওর পাইকারি মোকাম',
    upazilaList: [
      { en: 'Atpara', bn: 'আটপাড়া' },
      { en: 'Barhatta', bn: 'বারহাট্টা' },
      { en: 'Durgapur', bn: 'দুর্গাপুর' },
      { en: 'Kalmakanda', bn: 'কলমাকান্দা' },
      { en: 'Kendua', bn: 'কেন্দুয়া' },
      { en: 'Khaliajuri', bn: 'খালিয়াজুরী' },
      { en: 'Madan', bn: 'মদন' },
      { en: 'Mohanganj', bn: 'মোহনগঞ্জ' },
      { en: 'Netrokona Sadar', bn: 'নেত্রকোণা সদর' },
      { en: 'Purbadhala', bn: 'পূর্বধলা' },
    ],
  },
  {
    district: 'Sherpur',
    districtBn: 'শেরপুর',
    division: 'Mymensingh',
    divisionBn: 'ময়মনসিংহ',
    lat: 25.0205,
    lon: 90.0153,
    aliases: [],
    marketName: 'Nalitabari & Sherpur Rice Mandi',
    marketNameBn: 'নালিতাবাড়ী ও শেরপুর চাল মোকাম',
    upazilaList: [
      { en: 'Jhenaigati', bn: 'ঝিনাইগাতী' },
      { en: 'Nakla', bn: 'নকলা' },
      { en: 'Nalitabari', bn: 'নালিতাবাড়ী' },
      { en: 'Sherpur Sadar', bn: 'শেরপুর সদর' },
      { en: 'Sreebardi', bn: 'শ্রীবরদী' },
    ],
  },
];

// Sort alphabetically by English district name, keeping upazilas sorted alphabetically
const SORTED_DISTRICTS = [...RAW_DISTRICTS]
  .sort((a, b) => a.district.localeCompare(b.district))
  .map((d) => {
    const sortedUpazilas = [...d.upazilaList].sort((a, b) => a.en.localeCompare(b.en));
    return {
      district: d.district,
      districtBn: d.districtBn,
      division: d.division,
      divisionBn: d.divisionBn,
      lat: d.lat,
      lon: d.lon,
      aliases: d.aliases || [],
      marketName: d.marketName,
      marketNameBn: d.marketNameBn,
      upazilas: sortedUpazilas.map((u) => u.en),
      upazilaList: sortedUpazilas,
    };
  });

// ─── STRICT INTEGRITY ASSERTIONS ─────────────────────────────────────────────
const districtSet = new Set();
let totalUpazilas = 0;

for (const d of SORTED_DISTRICTS) {
  if (districtSet.has(d.district.toLowerCase())) {
    throw new Error(`Duplicate district detected: ${d.district}`);
  }
  districtSet.add(d.district.toLowerCase());

  if (!d.districtBn || !d.division || !d.divisionBn) {
    throw new Error(`Missing metadata on district: ${d.district}`);
  }
  if (!Array.isArray(d.upazilaList) || d.upazilaList.length === 0) {
    throw new Error(`Empty upazila list on district: ${d.district}`);
  }

  const upzSet = new Set();
  for (const u of d.upazilaList) {
    if (!u.en || !u.bn) {
      throw new Error(`Missing bilingual upazila name in ${d.district}: ${JSON.stringify(u)}`);
    }
    if (upzSet.has(u.en.toLowerCase())) {
      throw new Error(`Duplicate upazila "${u.en}" in district ${d.district}`);
    }
    upzSet.add(u.en.toLowerCase());
  }
  totalUpazilas += d.upazilaList.length;
}

if (SORTED_DISTRICTS.length !== 64) {
  throw new Error(`Expected exactly 64 districts, found ${SORTED_DISTRICTS.length}`);
}
if (totalUpazilas !== 495) {
  throw new Error(`Expected exactly 495 official upazilas, found ${totalUpazilas}`);
}

// ─── WRITE JSON ARTIFACT ─────────────────────────────────────────────────────
const utilsDir = path.join(ROOT_DIR, 'src', 'utils');
fs.mkdirSync(utilsDir, { recursive: true });

const jsonOutPath = path.join(utilsDir, 'bdGeoData.json');
fs.writeFileSync(
  jsonOutPath,
  JSON.stringify(
    {
      country: 'Bangladesh',
      totalDivisions: BD_DIVISIONS.length,
      totalDistricts: SORTED_DISTRICTS.length,
      totalUpazilas,
      divisions: BD_DIVISIONS,
      districts: SORTED_DISTRICTS,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

// ─── WRITE STRONGLY-TYPED TYPESCRIPT MODULE ──────────────────────────────────
const tsOutPath = path.join(utilsDir, 'bdGeoData.ts');
const tsSource = `/**
 * Centralized Exhaustive Administrative Geography of Bangladesh
 * 8 Divisions • 64 Districts • 495 Official Upazilas (Bilingual English + Bangla)
 *
 * Auto-generated & verified via \`node scripts/generateBdGeoData.mjs\`.
 */

import type { Language } from '../types';

export interface BdUpazila {
  en: string;
  bn: string;
}

export interface BdDivision {
  en: string;
  bn: string;
}

export interface BdDistrict {
  district: string;
  districtBn: string;
  division: string;
  divisionBn: string;
  lat: number;
  lon: number;
  aliases: string[];
  marketName: string;
  marketNameBn: string;
  upazilas: string[];
  upazilaList: BdUpazila[];
}

export const BD_DIVISIONS: BdDivision[] = ${JSON.stringify(BD_DIVISIONS, null, 2)};

export const BD_GEO_DATA: BdDistrict[] = ${JSON.stringify(SORTED_DISTRICTS, null, 2)};

/** Sorted list of all 64 canonical English district names */
export const ALL_64_DISTRICT_NAMES: string[] = BD_GEO_DATA.map((d) => d.district);

// Precomputed O(1) lookup index for English names, Bangla names, and spelling aliases
const DISTRICT_LOOKUP_MAP = new Map<string, BdDistrict>();
for (const entry of BD_GEO_DATA) {
  DISTRICT_LOOKUP_MAP.set(entry.district.toLowerCase(), entry);
  DISTRICT_LOOKUP_MAP.set(entry.district.toLowerCase().replace(/[^a-z0-9]/g, ''), entry);
  DISTRICT_LOOKUP_MAP.set(entry.districtBn, entry);
  for (const alias of entry.aliases) {
    DISTRICT_LOOKUP_MAP.set(alias.toLowerCase(), entry);
    DISTRICT_LOOKUP_MAP.set(alias.toLowerCase().replace(/[^a-z0-9]/g, ''), entry);
  }
}

/**
 * Resolves any district name, Bangla name, or legacy spelling alias (e.g. "Bogra", "Chittagong", "Jessore", "Comilla", "Barisal")
 * to its canonical BdDistrict object.
 */
export function findBdDistrict(districtInput?: string | null): BdDistrict | undefined {
  if (!districtInput) return undefined;
  const trimmed = districtInput.trim();
  if (!trimmed) return undefined;
  const direct = DISTRICT_LOOKUP_MAP.get(trimmed.toLowerCase()) || DISTRICT_LOOKUP_MAP.get(trimmed);
  if (direct) return direct;
  const alnum = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (alnum) return DISTRICT_LOOKUP_MAP.get(alnum);
  return undefined;
}

/**
 * Normalizes any district input to its canonical English district name (or returns trimmed input if unknown).
 */
export function normalizeBdDistrictName(districtInput?: string | null, fallback = 'Bogura'): string {
  const found = findBdDistrict(districtInput);
  if (found) return found.district;
  return districtInput?.trim() || fallback;
}

/**
 * Returns the localized district name (Bangla when language === 'bn', English otherwise).
 */
export function getDistrictLabel(districtInput: string | undefined | null, language: Language): string {
  if (!districtInput) return '';
  const found = findBdDistrict(districtInput);
  if (!found) return districtInput;
  return language === 'bn' ? found.districtBn : found.district;
}

/**
 * Converts any of the 64 districts (or spelling aliases) to its official Bangla name.
 */
export function toBanglaDistrictName(districtInput?: string | null): string {
  if (!districtInput) return '';
  const found = findBdDistrict(districtInput);
  return found ? found.districtBn : districtInput;
}

/**
 * Dynamically returns the exact list of bilingual upazilas belonging ONLY to the selected district.
 * Optionally preserves a legacy/custom upazila value if passed in \`preserveCurrent\`.
 */
export function getUpazilasByDistrict(
  districtInput?: string | null,
  preserveCurrent?: string | null
): BdUpazila[] {
  const found = findBdDistrict(districtInput);
  const baseList = found ? found.upazilaList : [];
  if (
    preserveCurrent &&
    preserveCurrent.trim() &&
    !baseList.some((u) => u.en.toLowerCase() === preserveCurrent.trim().toLowerCase())
  ) {
    return [{ en: preserveCurrent.trim(), bn: preserveCurrent.trim() }, ...baseList];
  }
  return baseList;
}

/**
 * Dynamically returns the English upazila names belonging ONLY to the selected district.
 */
export function getUpazilaNamesByDistrict(districtInput?: string | null): string[] {
  const found = findBdDistrict(districtInput);
  return found ? found.upazilas : [];
}

/**
 * Returns the default (first) upazila for a given district, or '' if not found.
 */
export function getDefaultUpazilaForDistrict(districtInput?: string | null): string {
  const list = getUpazilaNamesByDistrict(districtInput);
  return list.length > 0 ? list[0] : '';
}

/**
 * Checks whether \`upazilaName\` belongs to \`districtInput\`.
 */
export function isValidUpazilaForDistrict(districtInput?: string | null, upazilaName?: string | null): boolean {
  if (!districtInput || !upazilaName) return false;
  const list = getUpazilasByDistrict(districtInput);
  const clean = upazilaName.trim().toLowerCase();
  return list.some((u) => u.en.toLowerCase() === clean || u.bn === upazilaName.trim());
}

/**
 * Returns the localized upazila display label (Bangla when language === 'bn', English otherwise).
 */
export function getUpazilaLabel(
  districtInput: string | undefined | null,
  upazilaInput: string | undefined | null,
  language: Language
): string {
  if (!upazilaInput) return '';
  const clean = upazilaInput.trim().toLowerCase();
  if (districtInput) {
    const foundDist = findBdDistrict(districtInput);
    const match = foundDist?.upazilaList.find(
      (u) => u.en.toLowerCase() === clean || u.bn === upazilaInput.trim()
    );
    if (match) return language === 'bn' ? match.bn : match.en;
  }
  // Global fallback across all 495 upazilas if district wasn't provided
  for (const d of BD_GEO_DATA) {
    const match = d.upazilaList.find(
      (u) => u.en.toLowerCase() === clean || u.bn === upazilaInput.trim()
    );
    if (match) return language === 'bn' ? match.bn : match.en;
  }
  return upazilaInput;
}
`;

fs.writeFileSync(tsOutPath, tsSource, 'utf8');

console.log(
  `[✓] Generated ${SORTED_DISTRICTS.length} Districts & ${totalUpazilas} Upazilas across ${BD_DIVISIONS.length} Divisions:\n` +
    `    • ${path.relative(ROOT_DIR, jsonOutPath)}\n` +
    `    • ${path.relative(ROOT_DIR, tsOutPath)}`
);
