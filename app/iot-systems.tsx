import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ImageBackground,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  Settings,
  Zap,
  Droplets,
  Wind,
  Wifi,
  BatteryCharging,
  Target,
  PlaneTakeoff,
  PlaneLanding,
  CloudRain,
  Map,
  Plus,
  X,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Tv,
  ShieldCheck,
  Radio,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { Gate } from '../lib/access';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { GlassCard } from '../components/PageScaffold';

interface IoTDevice {
  id: string;
  name: string;
  nameSw: string;
  type: 'DRONE' | 'SENSOR' | 'WEATHER' | 'IRRIGATION' | 'GATE' | 'WATER';
  iconName: 'target' | 'zap' | 'wind' | 'droplets' | 'cpu' | 'tv';
  battery: number;
  latency: number;
  lastSeen: string;
  lastSeenSw: string;
  status: 'active' | 'searching' | 'offline';
  serialNumber: string;
  agroIdLinked: string | null;
}

const INITIAL_DEVICES: IoTDevice[] = [
  {
    id: 'RIFT-AGRI-1',
    name: 'RIFT Agri-Hexacopter AD-40',
    nameSw: 'Agri-Hexacopter AD-40 RIFT',
    type: 'DRONE',
    iconName: 'target',
    battery: 84,
    latency: 92,
    lastSeen: '1 minute ago',
    lastSeenSw: 'Dk 1 iliyopita',
    status: 'active',
    serialNumber: 'RIFT-AG-8812',
    agroIdLinked: 'AGRO-MAJ-920',
  },
  {
    id: 'RIFT-SOIL-2',
    name: 'Soil Analysis Hexacopter (RIFT-SA6)',
    nameSw: 'Drone ya Kuchunguza Udongo (RIFT-SA6)',
    type: 'DRONE',
    iconName: 'zap',
    battery: 92,
    latency: 120,
    lastSeen: '5 minutes ago',
    lastSeenSw: 'Dk 5 zilizopita',
    status: 'active',
    serialNumber: 'RIFT-SA-4019',
    agroIdLinked: 'AGRO-MAJ-920',
  },
  {
    id: 'RIFT-NOMAD-3',
    name: 'RIFT-Nomad Heavy-Lift Drone',
    nameSw: 'Drone ya Nomad Heavy-Lift',
    type: 'DRONE',
    iconName: 'wind',
    battery: 76,
    latency: 185,
    lastSeen: '12 minutes ago',
    lastSeenSw: 'Dk 12 zilizopita',
    status: 'active',
    serialNumber: 'RIFT-NM-1102',
    agroIdLinked: 'AGRO-MAJ-920',
  },
  {
    id: 'RIFT-HERD-4',
    name: 'RIFT HerdTag Gate Bridge',
    nameSw: 'Daraja la Lango la RIFT HerdTag',
    type: 'GATE',
    iconName: 'cpu',
    battery: 81,
    latency: 110,
    lastSeen: '8 minutes ago',
    lastSeenSw: 'Dk 8 zilizopita',
    status: 'active',
    serialNumber: 'RIFT-HT-004',
    agroIdLinked: 'AGRO-MAJ-920',
  },
  {
    id: 'RIFT-VAULT-5',
    name: 'RIFT VaultSense Kit',
    nameSw: 'Kifurushi cha RIFT VaultSense',
    type: 'WEATHER',
    iconName: 'droplets',
    battery: 68,
    latency: 145,
    lastSeen: '2 minutes ago',
    lastSeenSw: 'Dk 2 zilizopita',
    status: 'active',
    serialNumber: 'RIFT-VS-0891',
    agroIdLinked: 'AGRO-MAJ-920',
  },
  {
    id: 'RIFT-CHAIN-6',
    name: 'SecureChain Cold Logger',
    nameSw: 'Kirekodi Joto cha SecureChain',
    type: 'SENSOR',
    iconName: 'tv',
    battery: 95,
    latency: 75,
    lastSeen: 'Just now',
    lastSeenSw: 'Hivi sasa',
    status: 'active',
    serialNumber: 'RIFT-SC-9041',
    agroIdLinked: 'AGRO-MAJ-920',
  },
];

interface SpecComponent {
  name: string;
  nameSw: string;
  product: string;
  cost: string;
  costSw: string;
  desc: string;
  descSw: string;
  url: string | null;
}

interface GuideStep {
  title: string;
  titleSw: string;
  desc: string;
  descSw: string;
}

interface DeviceHardwareData {
  specs: SpecComponent[];
  tools: string[];
  toolsSw: string[];
  assumptions: string[];
  assumptionsSw: string[];
  fabrication: GuideStep[];
  wiring: GuideStep[];
  bringup: GuideStep[];
  assembly: GuideStep[];
}

const HARDWARE_DATA: Record<string, DeviceHardwareData> = {
  'RIFT-AGRI-1': {
    specs: [
      {
        name: 'Flight Controller',
        nameSw: 'Mdhibiti wa Ndege',
        product: 'Holybro Pixhawk 6C',
        cost: '$220',
        costSw: 'TSh 572,000',
        desc: 'High-performance flight controller for autonomous mission planning and hexacopter stabilization.',
        descSw:
          'Mdhibiti wa ndege wa utendaji wa juu kwa upangaji wa safari za anga na uimarishaji wa hexacopter.',
        url: 'https://www.amazon.com/s?k=Holybro+Pixhawk+6C',
      },
      {
        name: 'GNSS GPS Module',
        nameSw: 'Moduli ya GPS GNSS',
        product: 'Holybro M10 GPS',
        cost: '$55',
        costSw: 'TSh 143,000',
        desc: 'High-precision GNSS module for accurate positioning and waypoint navigation.',
        descSw:
          'Moduli ya GPS ya usahihi wa hali ya juu kwa maeneo sahihi na urambazaji wa pointi za anga.',
        url: 'https://www.amazon.com/s?k=Holybro+M10+GPS',
      },
      {
        name: 'Multispectral Payload',
        nameSw: 'Kipimo cha Multispectral',
        product: 'MicaSense RedEdge-P',
        cost: '$4,500',
        costSw: 'TSh 11,700,000',
        desc: 'High-resolution multispectral sensor for crop health analysis and vegetation indices.',
        descSw:
          'Kihisi cha multispectral cha azimio la juu kwa uchambuzi wa afya ya mazao na fahirisi za uoto.',
        url: 'https://www.micasense.com/rededge-p/',
      },
      {
        name: 'Propulsion Motors',
        nameSw: 'Mota za Kusukuma',
        product: '6x Brushless DC Motors',
        cost: '$450',
        costSw: 'TSh 1,170,000',
        desc: 'Brushless DC motors with electronic speed controllers for heavy-lift aerial propulsion.',
        descSw:
          'Mota za DC zisizo na brashi zilizo na vidhibiti vya kasi vya kielektroniki kwa urushaji wa mizigo mizito.',
        url: null,
      },
      {
        name: 'Power System',
        nameSw: 'Mfumo wa Nguvu',
        product: '6S Li-Po Battery Pack',
        cost: '$350',
        costSw: 'TSh 910,000',
        desc: 'High-capacity 6S Lithium-Polymer battery with integrated power management module.',
        descSw:
          'Betri ya Lithium-Polymer ya 6S yenye uwezo mkubwa na moduli ya usimamizi wa nguvu iliyounganishwa.',
        url: null,
      },
    ],
    tools: [
      'Soldering iron with high-wattage tip for XT90 connectors',
      'Hex key set (M2, M3, M4)',
      'Precision wire strippers',
      'Multimeter for continuity and voltage checks',
      '3D printer (ASA/PETG capable)',
      'Nylon zip ties and heat shrink tubing',
    ],
    toolsSw: [
      'Pasi ya kulezea yenye ncha ya wati nyingi kwa viunganishi vya XT90',
      'Seti ya funguo za heksi (M2, M3, M4)',
      'Kikata waya kwa usahihi',
      'Mita ya umeme (multimeter) kwa ajili ya kuangalia mwendelezo na voltage',
      'Printa ya 3D (inayoweza kuchapisha ASA/PETG)',
      'Kamba za nailoni (zip ties) na neli za kupunguza joto (heat shrink)',
    ],
    assumptions: [
      'Builder has experience with high-current LiPo batteries',
      'ArduPilot or PX4 firmware configuration knowledge',
      'Soldering experience for power distribution leads',
      'Access to 3D printing for structural mounts',
    ],
    assumptionsSw: [
      'Mjenzi ana uzoefu na betri za LiPo za sasa ya juu',
      'Ujuzi wa usanidi wa firmware ya ArduPilot au PX4',
      'Uzoefu wa kuleza kwa waya za usambazaji wa nguvu',
      'Upatikanaji wa uchapishaji wa 3D kwa ajili ya milingoti ya muundo',
    ],
    fabrication: [
      {
        title: 'Print Structural Mounts',
        titleSw: 'Chapisha Milingoti ya Muundo',
        desc: 'Print structural mounts in high-temperature ASA or PETG materials with 40% gyroid infill for maximum strength.',
        descSw:
          'Chapisha milingoti ya muundo katika nyenzo za ASA au PETG za joto la juu zenye ujazo wa gyroid wa 40% kwa nguvu ya juu.',
      },
      {
        title: 'Vibration-Damping Mounts',
        titleSw: 'Milingoti ya Kupunguza Mtetemo',
        desc: 'Print flight controller vibration-damping mounts in flexible TPU filament (95A hardness).',
        descSw:
          'Chapisha milingoti ya kupunguza mtetemo wa mdhibiti wa ndege katika nyuzi rahisi ya TPU (ugumu wa 95A).',
      },
      {
        title: 'Fabricate Component Enclosures',
        titleSw: 'Tengeneza Sehemu za Kuhifadhi',
        desc: 'Print ESC clips and telemetry radio mounts using standard PLA/PETG materials.',
        descSw:
          'Chapisha klipu za ESC na milingoti ya redio ya telemetry kwa kutumia nyenzo za kawaida za PLA/PETG.',
      },
    ],
    wiring: [
      {
        title: 'Power Harness',
        titleSw: 'Mshipi wa Nguvu',
        desc: 'Solder the main power distribution board harness with high-current XT90 anti-spark connectors.',
        descSw:
          'Leza mshipi mkuu wa bodi ya usambazaji wa nguvu na viunganishi vya sasa ya juu vya XT90 vya kuzuia cheche.',
      },
      {
        title: 'Motor Phase Connections',
        titleSw: 'Viunganishi vya Awamu ya Mota',
        desc: 'Connect the three brushless motor phases to the Electronic Speed Controller (ESC) outputs and cover with 5mm heat shrink.',
        descSw:
          'Unganisha awamu tatu za mota zisizo na brashi kwenye matokeo ya ESC na ufunike kwa neli za kupunguza joto za 5mm.',
      },
      {
        title: 'Signal Lines',
        titleSw: 'Njia za Mawimbi',
        desc: 'Route PWM or DShot signal cables from the ESCs to the flight controller outputs, keeping them away from high-current battery leads.',
        descSw:
          'Elekeza nyaya za mawimbi za PWM au DShot kutoka kwa ESC hadi matokeo ya mdhibiti wa ndege, ukiweka mbali na nyaya za betri za sasa ya juu.',
      },
    ],
    bringup: [
      {
        title: 'Firmware Flashing',
        titleSw: 'Kuweka Firmware',
        desc: 'Flash ArduCopter or PX4 Hexacopter firmware onto the flight controller using Mission Planner or QGroundControl.',
        descSw:
          'Weka firmware ya ArduCopter au PX4 Hexacopter kwenye mdhibiti wa ndege kwa kutumia Mission Planner au QGroundControl.',
      },
      {
        title: 'Sensor Calibration',
        titleSw: 'Urekebishaji wa Sensorer',
        desc: 'Calibrate the onboard IMU, dual compasses, and GPS module on a flat, level surface away from metallic interference.',
        descSw:
          'Rekebisha IMU ya ndani, dira mbili, na moduli ya GPS kwenye uso tambarare mbali na mwingiliano wa metali.',
      },
      {
        title: 'ESC Calibration',
        titleSw: 'Urekebishaji wa ESC',
        desc: 'Perform throttle range calibration for all 6 ESCs and verify correct motor spinning directions.',
        descSw:
          'Fanya urekebishaji wa anuwai ya throttle kwa ESC zote 6 na uthibitishe mwelekeo sahihi wa kuzunguka kwa mota.',
      },
    ],
    assembly: [
      {
        title: 'Frame Assembly',
        titleSw: 'Uunganishaji wa Fremu',
        desc: 'Clamp carbon fiber tubes into the center plates, securing folding mechanism bolts with blue threadlocker.',
        descSw:
          'Bana mirija ya nyuzi za kaboni kwenye bodi za katikati, ukifunga boli za utaratibu wa kukunja kwa gundi ya bluu.',
      },
      {
        title: 'Motor and ESC Mounting',
        titleSw: 'Ufungaji wa Mota na ESC',
        desc: 'Mount the 6 motors to the end of the carbon arms, securing ESCs underneath using zip ties.',
        descSw:
          'Weka mota 6 mwishoni mwa mikono ya kaboni, ukifunga ESC chini kwa kutumia kamba za nailoni.',
      },
      {
        title: 'Flight Deck Installation',
        titleSw: 'Ufungaji wa Sitaha ya Ndege',
        desc: 'Mount the flight controller to the TPU damping plate, wire the GPS module onto a folding mast, and attach the MicaSense payload bay.',
        descSw:
          'Weka mdhibiti wa ndege kwenye bodi ya TPU ya kupunguza mtetemo, unganisha moduli ya GPS kwenye mlingoti wa kukunja, na uambatishe sehemu ya mzigo ya MicaSense.',
      },
    ],
  },
  'RIFT-SOIL-2': {
    specs: [
      {
        name: 'Autopilot Controller',
        nameSw: 'Mdhibiti wa Autopilot',
        product: 'Cube Orange+ Standard Set',
        cost: '$350',
        costSw: 'TSh 910,000',
        desc: 'Triple-redundant autopilot running PX4/ArduPilot for high-reliability soil analysis flights.',
        descSw:
          'Autopilot ya ziada mara tatu inayotumia PX4/ArduPilot kwa safari za anga za uhakika wa juu za uchambuzi wa udongo.',
        url: 'https://www.digikey.com/en/products/result?keywords=Cube+Orange+Plus',
      },
      {
        name: 'Companion Compute Node',
        nameSw: 'Kompyuta Andani ya Edge',
        product: 'NVIDIA Jetson Orin Nano',
        cost: '$499',
        costSw: 'TSh 1,297,400',
        desc: 'Edge AI processing unit with 8GB memory for real-time multispectral index generation and vision-based landing.',
        descSw:
          'Kompyuta ya Edge AI yenye kumbukumbu ya 8GB kwa ajili ya uzalishaji wa fahirisi za uoto na kutua kwa kutumia kamera.',
        url: 'https://www.digikey.com/en/products/result?keywords=Jetson+Orin+Nano',
      },
      {
        name: 'Multispectral Camera',
        nameSw: 'Kamera ya Multispectral',
        product: 'MicaSense RedEdge-P',
        cost: '$8,500',
        costSw: 'TSh 22,100,000',
        desc: 'Premium high-resolution sensor mapping crop vigor, nitrogen levels, and soil moisture variations.',
        descSw:
          'Kihisi cha ubora wa juu cha ramani ya afya ya mazao, viwango vya nitrojeni, na mabadiliko ya unyevu wa udongo.',
        url: 'https://www.micasense.com/rededge-p/',
      },
      {
        name: 'Precision RTK GPS',
        nameSw: 'RTK GPS ya Usahihi',
        product: 'Here3+ GPS RTK Module',
        cost: '$220',
        costSw: 'TSh 572,000',
        desc: 'Centimeter-level accuracy positioning module utilizing RTK corrections.',
        descSw: 'Moduli ya mahali ya usahihi wa sentimita kwa kutumia marekebisho ya RTK.',
        url: 'https://www.digikey.com/en/products/result?keywords=Here3+GPS',
      },
      {
        name: 'Heavy-Lift Motors',
        nameSw: 'Mota za Mizigo Mizito',
        product: '6x T-Motor MN4014 KV400',
        cost: '$450',
        costSw: 'TSh 1,170,000',
        desc: 'High-thrust motors with T-Motor Flame 60A ESCs for stable flight under heavy payloads.',
        descSw:
          'Mota za nguvu za juu zenye ESC za T-Motor Flame 60A kwa safari thabiti chini ya mizigo mizito.',
        url: 'https://www.amazon.com/s?k=T-Motor+MN4014',
      },
    ],
    tools: [
      '3D printer with ASA/PETG capabilities',
      'M2.5 and M3 hex keys',
      'Soldering station with high-thermal capacity tip',
      'Heat gun for heat shrink',
      'Wire strippers and crimping tool',
      'Multimeter',
      'Laptop with ArduPilot/PX4 Ground Control Station',
    ],
    toolsSw: [
      'Printa ya 3D yenye uwezo wa ASA/PETG',
      'Funguo za heksi za M2.5 na M3',
      'Kituo cha kulezea chenye uwezo wa juu wa joto',
      'Kikavu cha joto (heat gun) kwa ajili ya kupunguza neli',
      'Zana za kukata na kubana waya (crimping tool)',
      'Mita ya umeme (multimeter)',
      'Kompyuta yenye Ground Control Station ya ArduPilot/PX4',
    ],
    assumptions: [
      'Builder has experience with high-current LiPo safety',
      'Familiarity with UAV ground control software',
      'Access to a flat, level surface for IMU/Compass calibration',
      'Basic knowledge of Linux/Ubuntu for companion computer setup',
    ],
    assumptionsSw: [
      'Mjenzi ana uzoefu na usalama wa betri za LiPo za sasa ya juu',
      'Kufahamiana na programu ya kudhibiti UAV (Ground Control)',
      'Upatikanaji wa uso tambarare kwa ajili ya IMU/Dira calibration',
      'Ujuzi wa kimsingi wa Linux/Ubuntu kwa usanidi wa kompyuta andani',
    ],
    fabrication: [
      {
        title: 'Print Companion Computer Mounts',
        titleSw: 'Chapisha Milingoti ya Kompyuta Andani',
        desc: 'Load PETG filament and print the Jetson Mount Plate flat on the bed using 30% infill and 3 shells.',
        descSw:
          'Weka nyuzi ya PETG and uchapishe Sahani ya Mlima wa Jetson ikiwa tambarare kwa kutumia ujazo wa 30% na makombora 3.',
      },
      {
        title: 'Print Landing Cradles',
        titleSw: 'Chapisha Milingoti ya Kutua',
        desc: 'Print 4 Vehicle Landing Cradle components in ASA using 40% infill and 4 shells to guarantee UV resistance.',
        descSw:
          'Chapisha vipengele 4 vya Mlingoti wa Kutua katika ASA kwa kutumia ujazo wa 40% na makombora 4 ili kuhakikisha upinzani wa UV.',
      },
    ],
    wiring: [
      {
        title: 'Main Power Distribution',
        titleSw: 'Usambazaji wa Nguvu Mkuu',
        desc: 'Solder the main XT90-AS anti-spark power lead and ESC battery cables to the PDB board.',
        descSw:
          'Leza risasi kuu ya nguvu ya XT90-AS ya kuzuia cheche na nyaya za betri za ESC kwenye bodi ya PDB.',
      },
      {
        title: 'Companion Power Supply',
        titleSw: 'Ugavi wa Nguvu wa Kompyuta Andani',
        desc: 'Connect the Jetson Orin Nano power input pins to the 12V regulated regulator rail from the Mauch power module.',
        descSw:
          'Unganisha pini za pembejeo za nguvu za Jetson Orin Nano kwenye njia ya kidhibiti ya 12V kutoka kwa moduli ya nguvu ya Mauch.',
      },
      {
        title: 'Telemetry Links',
        titleSw: 'Viungo vya Telemetry',
        desc: 'Wire CAN bus lines from Here3+ GPS to autopilot and UART lines from Jetson companion computer to TELEM2 port.',
        descSw:
          'Unganisha nyaya za CAN bus kutoka Here3+ GPS hadi autopilot na nyaya za UART kutoka kompyuta ya Jetson hadi bandari ya TELEM2.',
      },
    ],
    bringup: [
      {
        title: 'Autopilot Setup',
        titleSw: 'Usanidi wa Autopilot',
        desc: 'Flash ArduCopter firmware, set hexacopter frame geometry, and perform ESC endpoint range calibration.',
        descSw:
          'Weka firmware ya ArduCopter, weka jiometri ya fremu ya hexacopter, na ufanye urekebishaji wa anuwai ya ESC.',
      },
      {
        title: 'RTK Injection Test',
        titleSw: 'Jaribio la Uingizaji wa RTK',
        desc: 'Establish RTK corrections via the ground control station and verify centimeter-level positioning accuracy.',
        descSw:
          'Weka marekebisho ya RTK kupitia kituo cha kudhibiti ardhi na uthibitishe usahihi wa nafasi ya sentimita.',
      },
      {
        title: 'MAVLink Verification',
        titleSw: 'Uthibitishaji wa MAVLink',
        desc: 'Log into Jetson Linux terminal and run companion-computer service to verify active bidirectional MAVLink packets.',
        descSw:
          'Ingia kwenye terminal ya Jetson Linux na uendeshe huduma ya kompyuta andani ili kuthibitisha pakiti za MAVLink.',
      },
    ],
    assembly: [
      {
        title: 'Core Electronics Integration',
        titleSw: 'Uunganishaji wa Kielektroniki',
        desc: 'Secure the autopilot Cube and Mauch PDB in the center plates, securing with vibration-damping TPU standoffs.',
        descSw:
          'Funga autopilot Cube na Mauch PDB kwenye bodi za katikati, ukifunga kwa TPU za kupunguza mtetemo.',
      },
      {
        title: 'Propulsion Assembly',
        titleSw: 'Mkusanyiko wa Kusukuma',
        desc: 'Mount the brushless motors and 15-inch folding props onto the carbon arms, verifying motor layout order.',
        descSw:
          'Weka mota na mapanga ya kukunja ya inchi 15 kwenye mikono ya kaboni, ukithibitisha mpangilio sahihi wa mota.',
      },
      {
        title: 'Camera Gimbal Attachment',
        titleSw: 'Ufungaji wa Gimbal ya Kamera',
        desc: 'Mount the MicaSense camera on the 3D-printed gimbal mount underneath the payload bay, ensuring free motion.',
        descSw:
          'Weka kamera ya MicaSense kwenye mlingoti wa gimbal uliochapishwa wa 3D chini ya sehemu ya mzigo, ukihakikisha mwendo huru.',
      },
    ],
  },
  'RIFT-NOMAD-3': {
    specs: [
      {
        name: 'Flight Autopilot',
        nameSw: 'Autopilot ya Ndege',
        product: 'Cube Orange+ ADSB Carrier Board',
        cost: '$650',
        costSw: 'TSh 1,690,000',
        desc: 'Autopilot with redundancy and integrated ADSB receiver to detect manned aircraft.',
        descSw:
          'Autopilot yenye mfumo wa ziada na mpokeaji wa ADSB ili kugundua ndege zenye rubani.',
        url: 'https://www.getfpv.com/cube-orange-standard-set-with-ads-b-carrier-board.html',
      },
      {
        name: 'Avoidance Camera',
        nameSw: 'Kamera ya Kuepuka Vizuizi',
        product: 'Intel RealSense D455',
        cost: '$439',
        costSw: 'TSh 1,141,400',
        desc: 'Stereoscopic depth camera for visual SLAM navigation and collision avoidance.',
        descSw: 'Kamera ya kina ya stereoscopic kwa urambazaji wa SLAM na kuepuka migongano.',
        url: 'https://www.mouser.com/ProductDetail/Intel/82635DSD455',
      },
      {
        name: 'Secure Telemetry Radio',
        nameSw: 'Redio Salama ya Telemetry',
        product: 'Microhard Pico Enclosed P900',
        cost: '$350',
        costSw: 'TSh 910,000',
        desc: 'Encrypted long-range 900MHz wireless data link for command and control telemetry.',
        descSw:
          'Mawasiliano ya waya ya 900MHz yenye usimbaji fiche kwa ajili ya telemetry na amri.',
        url: 'https://www.unmannedsystemsresource.com/product/pico-p900-radio/',
      },
      {
        name: 'High-Current PDB',
        nameSw: 'Bodi ya Usambazaji ya Sasa ya Juu',
        product: 'Maucht HYB-PDB 200A',
        cost: '$180',
        costSw: 'TSh 468,000',
        desc: 'High-current power distribution board supporting up to 14S LiPo configurations.',
        descSw: 'Bodi ya usambazaji wa nguvu ya juu inayounga mkono hadi usanidi wa LiPo wa 14S.',
        url: 'https://www.mauch-electronic.com/pdb-series',
      },
      {
        name: 'Laser Altimeter',
        nameSw: 'Altimeta ya Laser',
        product: 'LightWare SF20/C Lidar',
        cost: '$280',
        costSw: 'TSh 728,000',
        desc: 'Laser rangefinder for millimeter-accurate terrain-following and altitude holds.',
        descSw: 'Kipimo cha laser kwa ufuatiliaji sahihi wa ardhi na urefu wa anga.',
        url: 'https://lightwarelidar.com/products/sf20-c-100m',
      },
    ],
    tools: [
      'Soldering station with high-thermal capacity',
      'M3 and M5 hex drivers',
      'Wire strippers and coaxial cable crimpers',
      'Multimeter and oscilloscope',
      '3D printer with ABS/ASA enclosure capabilities',
    ],
    toolsSw: [
      'Kituo cha kulezea chenye uwezo wa juu wa joto',
      'Dereva za heksi za M3 na M5',
      'Vikata waya na zana ya kubana nyaya za coaxial',
      'Multimeter na oscilloscope',
      'Printa ya 3D yenye uwezo wa kuchapisha ABS/ASA',
    ],
    assumptions: [
      'Experience with 12S-14S high-voltage power paths',
      'Understanding of companion computer vision networks (ROS 2)',
      'Understanding of ADSB transponder rules and operations',
    ],
    assumptionsSw: [
      'Uzoefu na njia za nguvu za voltage ya juu za 12S-14S',
      'Uelewa wa mitandao ya kamera ya kompyuta andani (ROS 2)',
      'Uelewa wa sheria na shughuli za transponder ya ADSB',
    ],
    fabrication: [
      {
        title: 'Print Coaxial Motor Mounts',
        titleSw: 'Chapisha Milingoti ya Coaxial ya Mota',
        desc: 'Print 4 coaxial motor mounts in Carbon-Filled Nylon using 100% infill for maximum load rating.',
        descSw:
          'Chapisha milingoti 4 ya mota ya coaxial katika Nylon ya kaboni kwa kutumia ujazo wa 100% kwa uwezo wa juu wa mzigo.',
      },
      {
        title: 'Fabricate Weather-Sealed Enclosures',
        titleSw: 'Tengeneza Sehemu Zinazozuia Hali ya Hewa',
        desc: 'Print Jetson compute housing in ABS and the depth camera fairing in PETG.',
        descSw: 'Chapisha nyumba ya Jetson katika ABS na kifuniko cha kamera ya kina katika PETG.',
      },
    ],
    wiring: [
      {
        title: 'High Voltage Bus Solder',
        titleSw: 'Kuleza Njia Kuu ya Voltage ya Juu',
        desc: 'Solder high-voltage ESC power leads directly to the Mauch 200A PDB bus bar using lead-free silver solder.',
        descSw:
          'Leza nyaya za ESC za voltage ya juu moja kwa moja kwenye bodi ya Mauch 200A PDB kwa kutumia risasi ya fedha isiyo na risasi.',
      },
      {
        title: 'Redundant Power Integration',
        titleSw: 'Uunganishaji wa Nguvu wa Ziada',
        desc: 'Wire dual power modules from the 12S battery lines into power ports 1 and 2 on the Cube carrier board.',
        descSw:
          'Unganisha moduli mbili za nguvu kutoka kwenye betri za 12S hadi bandari za nguvu 1 na 2 kwenye bodi ya Cube.',
      },
    ],
    bringup: [
      {
        title: 'ADSB Receiver Scan',
        titleSw: 'Scan ya Mpokeaji wa ADSB',
        desc: 'Power on the carrier board, verify ADSB telemetry feeds, and run check sweeps for local transponders.',
        descSw:
          'Washa bodi kuu, thibitisha data ya ADSB, na ufanye vipimo kwa transponder za karibu.',
      },
      {
        title: 'Lidar Distance Check',
        titleSw: 'Jaribio la Umbali la Lidar',
        desc: 'Verify SF20/C lidar readings over serial, calibrating offsets to match the physical height profile.',
        descSw:
          'Thibitisha usomaji wa SF20/C lidar kupitia serial, ukirekebisha ili zilingane na urefu halisi.',
      },
    ],
    assembly: [
      {
        title: 'Chassis Tube Assembly',
        titleSw: 'Uunganishaji wa Mirija ya Fremu',
        desc: 'Assemble carbon fiber arms onto the core plates, securing locking bolts using threadlocker.',
        descSw:
          'Unganisha mikono ya nyuzi za kaboni kwenye bodi za katikati, ukifunga boli kwa gundi.',
      },
      {
        title: 'Peltier Cooler Integration',
        titleSw: 'Ufungaji wa Peltier Cooler',
        desc: 'Install thermoelectric coolers and heat sinks inside the medical cargo bay, routing control leads to companion computer.',
        descSw:
          'Weka Peltier coolers na heatsinks ndani ya chumba cha matibabu, ukielekeza nyaya za kudhibiti kwenye kompyuta.',
      },
    ],
  },
  'RIFT-HERD-4': {
    specs: [
      {
        name: 'Ear Tag Controller',
        nameSw: 'Mdhibiti wa Kifaa cha Sikio',
        product: 'Heltec CubeCell HTCC-AB01',
        cost: '$12.50',
        costSw: 'TSh 32,500',
        desc: 'Ultra-low power LoRaWAN node microcontroller with battery charging circuits.',
        descSw:
          'Microcontroller ya nguvu ya chini sana ya LoRaWAN yenye mzunguko wa kuchaji betri.',
        url: 'https://www.heltec.org/project/htcc-ab01/',
      },
      {
        name: 'Subcutaneous Thermistor',
        nameSw: 'Kipima Joto cha Ndani ya Ngozi',
        product: 'Digital I2C Thermistor Node',
        cost: '$4.50',
        costSw: 'TSh 11,700',
        desc: 'Digital digital temperature probe for monitoring core livestock body health.',
        descSw:
          'Kipima joto cha kielektroniki kwa ajili ya kufuatilia afya ya joto la mwili wa mifugo.',
        url: null,
      },
      {
        name: 'Gate Reader MCU',
        nameSw: 'Bodi ya Lango la RFID',
        product: 'ESP32-S3 cellular gateway',
        cost: '$35.00',
        costSw: 'TSh 91,000',
        desc: 'SIM7600G cellular ESP32 board acting as the RFID gate synchronizer.',
        descSw: 'Bodi ya ESP32 ya SIM7600G inayofanya kazi kama mpatanishi wa lango la RFID.',
        url: 'https://www.amazon.com/s?k=SIM7600G-H+ESP32',
      },
    ],
    tools: [
      '3D printer (TPU and ABS capable)',
      'Fine-tip soldering iron',
      'Wire strippers and snips',
      'M3 hex keys',
      'Multimeter',
    ],
    toolsSw: [
      'Printa ya 3D (inayoweza TPU na ABS)',
      'Pasi ya kulezea yenye ncha nzuri',
      'Zana za kukata waya',
      'Funguo za heksi za M3',
      'Mita ya umeme (multimeter)',
    ],
    assumptions: [
      'Stable LoRaWAN gateway in pasture area',
      'Basic Arduino IDE or PlatformIO experience',
      'Familiarity with flexible TPU printing parameters',
    ],
    assumptionsSw: [
      'Daraja thabiti la LoRaWAN kwenye eneo la malisho',
      'Uzoefu wa kimsingi wa Arduino IDE au PlatformIO',
      'Kufahamiana na vigezo vya uchapishaji wa TPU rahisi',
    ],
    fabrication: [
      {
        title: 'Print TPU Tag Casing',
        titleSw: 'Chapisha Kasha la TPU la Sikio',
        desc: 'Print the tag housing in flexible TPU with 100% infill to ensure complete water isolation and flexibility.',
        descSw:
          'Chapisha kasha la sikio katika TPU rahisi yenye ujazo wa 100% ili kuhakikisha uzuiaji kamili wa maji.',
      },
    ],
    wiring: [
      {
        title: 'Solder Tag Sensors',
        titleSw: 'Leza Sensorer za Sikio',
        desc: 'Solder the digital thermistor and accelerometer I2C lines to the Heltec CubeCell pins.',
        descSw:
          'Leza kipima joto cha dijitali na laini za I2C za accelerometer kwenye pini za Heltec CubeCell.',
      },
    ],
    bringup: [
      {
        title: 'Heltec Firmware Upload',
        titleSw: 'Pakia Firmware ya Heltec',
        desc: 'Upload the LoRaWAN tracking stack firmware using Arduino IDE and verify keys registration.',
        descSw:
          'Pakia firmware ya LoRaWAN ya ufuatiliaji kwa kutumia Arduino IDE na uthibitishe funguo.',
      },
    ],
    assembly: [
      {
        title: 'Tag Sealing',
        titleSw: 'Kufunga Kifaa cha Sikio',
        desc: 'Slide the electronics into the TPU tag housing and seal the perimeter using cyanoacrylate adhesive.',
        descSw:
          'Ingiza vifaa vya elektroniki kwenye kasha la TPU na ufunge ukingo kwa kutumia gundi maalum.',
      },
    ],
  },
  'RIFT-VAULT-5': {
    specs: [
      {
        name: 'Core Telemetry Unit',
        nameSw: 'Kikundi Kikuu cha Telemetry',
        product: 'SIM7600G-H ESP32-S3 Expansion',
        cost: '$35.00',
        costSw: 'TSh 91,000',
        desc: 'SIM7600G board integrating 4G/LTE connectivity, GPS, and ESP32 computing power.',
        descSw: 'Bodi ya SIM7600G inayounganisha mawasiliano ya 4G/LTE, GPS, na nguvu za ESP32.',
        url: 'https://www.amazon.com/s?k=SIM7600G-H+ESP32',
      },
      {
        name: 'Temp & Humidity Probe',
        nameSw: 'Kipima Joto na Unyevu cha Silo',
        product: 'SHT31-D Digital Sensor',
        cost: '$6.50',
        costSw: 'TSh 16,900',
        desc: 'High-accuracy I2C sensor probe designed for core agricultural silos.',
        descSw: 'Kipima joto na unyevu cha I2C kilichoundwa kwa ajili ya maghala ya mazao.',
        url: 'https://www.digikey.com/en/products/result?keywords=SHT31-D',
      },
      {
        name: 'CO2 Respiration Sensor',
        nameSw: 'Kihisi cha Gesi ya CO2',
        product: 'MH-Z19B NDIR CO2 Sensor',
        cost: '$18.00',
        costSw: 'TSh 46,800',
        desc: 'Infrared gas monitor for detection of grain respiration and crop spoilage signs.',
        descSw:
          'Kihisi cha gesi cha infrared kwa ajili ya kugundua upumuaji vya nafaka na uharibifu.',
        url: 'https://www.amazon.com/s?k=MH-Z19B',
      },
      {
        name: 'Volatile Gas Sensor',
        nameSw: 'Kihisi cha Gesi za Kikaboni',
        product: 'SGP30 Gas Sensor',
        cost: '$12.00',
        costSw: 'TSh 31,200',
        desc: 'Multi-pixel organic gas sensor for early warning of fruit and vegetable decomposition.',
        descSw: 'Kihisi cha gesi cha SGP30 kwa ajili ya tahadhari ya mapema ya uharibifu wa mboga.',
        url: 'https://www.adafruit.com/product/3709',
      },
      {
        name: 'Silo Weight Amplifier',
        nameSw: 'Kikuza Uzito cha Silo',
        product: 'HX711 24-Bit Digitizer',
        cost: '$1.50',
        costSw: 'TSh 3,900',
        desc: 'Precision load-cell analog-to-digital converter for real-time inventory weight tracking.',
        descSw: 'Kigeuzi cha usahihi cha mawimbi ya uzito kuwa dijitali kwa ufuatiliaji wa uzito.',
        url: 'https://www.sparkfun.com/products/13879',
      },
    ],
    tools: [
      '3D printer with PETG/ASA capabilities',
      'Soldering iron and lead-free solder',
      'Wire strippers and cutters',
      'Multimeter',
      'M3 and M4 hex keys',
      'Drill with 12mm bit for cable glands',
    ],
    toolsSw: [
      'Printa ya 3D yenye uwezo wa kuchapisha PETG/ASA',
      'Pasi ya kulezea na risasi isiyo na risasi',
      'Zana za kukata na kuvua waya',
      'Mita ya umeme (multimeter)',
      'Funguo za heksi za M3 na M4',
      'Tobo la kuchimbia lenye ncha ya 12mm kwa ajili ya tezi za kebo',
    ],
    assumptions: [
      'Active 4G SIM card with data plan',
      'PlatformIO or Arduino IDE software framework',
      'Familiarity with I2C and UART communications',
    ],
    assumptionsSw: [
      'Kadi ya SIM ya 4G yenye kifurushi cha data',
      'Mfumo wa programu wa PlatformIO au Arduino IDE',
      'Kufahamiana na mawasiliano ya I2C na UART',
    ],
    fabrication: [
      {
        title: 'Print Perforated Silo Probe',
        titleSw: 'Chapisha Kishikizo cha Silo',
        desc: 'Print the perforated sensor probe housing in PETG with 3 walls and 20% gyroid infill.',
        descSw:
          'Chapisha kishikizo kilichotobolewa cha sensorer katika PETG chenye kuta 3 na ujazo wa 20%.',
      },
    ],
    wiring: [
      {
        title: 'Wire Sensor Bus',
        titleSw: 'Unganisha Waya za Sensorer',
        desc: 'Connect SHT31-D and SGP30 sensors to the primary MCU I2C bus lines.',
        descSw: 'Unganisha sensorer za SHT31-D na SGP30 kwenye laini za I2C za bodi kuu.',
      },
    ],
    bringup: [
      {
        title: 'Run I2C Bus Scan',
        titleSw: 'Fanya I2C Scanner',
        desc: 'Flash I2C scanner code to verify addresses of all integrated sensors.',
        descSw:
          'Pakia programu ya I2C scanner ili kuthibitisha anwani za sensorer zote zilizounganishwa.',
      },
    ],
    assembly: [
      {
        title: 'Mount Core Components',
        titleSw: 'Unganisha Vipengele Muhimu',
        desc: 'Assemble sensors into their printed brackets and slide the array into the perforated silo probe.',
        descSw:
          'Weka sensorer kwenye mabano yake na telezesha seti nzima kwenye kishikizo cha silo.',
      },
    ],
  },
  'RIFT-CHAIN-6': {
    specs: [
      {
        name: 'Main Processing MCU',
        nameSw: 'Bodi Kuu ya Kuchakata',
        product: 'ESP32-S3-WROOM-1-N16R8',
        cost: '$6.50',
        costSw: 'TSh 16,900',
        desc: 'Dual-core processing module with integrated Wi-Fi and BLE capabilities.',
        descSw: 'Bodi ya core mbili yenye uwezo wa Wi-Fi na Bluetooth iliyounganishwa.',
        url: 'https://www.digikey.com/en/products/detail/espressif-systems/ESP32-S3-WROOM-1-N16R8/15970924',
      },
      {
        name: 'GSM cellular Modem',
        nameSw: 'Modem ya Simu ya GSM',
        product: 'SIM7080G LTE-M/NB-IoT Module',
        cost: '$22.00',
        costSw: 'TSh 57,200',
        desc: 'Dual-mode cellular modem for remote global shipping track updates.',
        descSw: 'Modem ya mawasiliano ya simu ya njia mbili kwa ajili ya kufuatilia mizigo.',
        url: 'https://www.amazon.com/s?k=SIM7080G+breakout',
      },
      {
        name: 'RFID Cargo Seal Reader',
        nameSw: 'Kihisi cha RFID cha Kufungia',
        product: 'MFRC522 RFID Module',
        cost: '$4.50',
        costSw: 'TSh 11,700',
        desc: 'RFID transponder reader to validate electronic security seals on container doors.',
        descSw: 'Kihisi cha RFID ili kuthibitisha kufungwa salama kwa milango ya makontena.',
        url: 'https://www.amazon.com/s?k=MFRC522+RFID+module',
      },
      {
        name: 'High-Precision Temp Sensor',
        nameSw: 'Kihisi Joto cha Usahihi wa Hali ya Juu',
        product: 'TMP117 Digital Sensor',
        cost: '$5.80',
        costSw: 'TSh 15,080',
        desc: 'Digital sensor mapping ambient cargo temp within cold chains.',
        descSw: 'Kihisi cha dijitali kinachopima joto la makontena ya baridi.',
        url: 'https://www.digikey.com/en/products/detail/texas-instruments/TMP117AIDRVM/9555238',
      },
      {
        name: 'Power Converter',
        nameSw: 'Kidhibiti cha Nguvu',
        product: 'TPS63060 Buck-Boost Module',
        cost: '$3.40',
        costSw: 'TSh 8,840',
        desc: 'Buck-boost converter delivering stable 3.3V power from Li-ion source.',
        descSw: 'Kigeuzi cha kutoa nguvu thabiti ya 3.3V kutoka kwenye betri ya Li-ion.',
        url: 'https://www.digikey.com/en/products/detail/texas-instruments/TPS63060DSCR/2260655',
      },
    ],
    tools: [
      '3D printer (Polycarbonate filament capable)',
      'Soldering station with fine tip',
      'Heat-set insert tip',
      'Precision Torx and hex screwdrivers',
      'Multimeter',
    ],
    toolsSw: [
      'Printa ya 3D (inayoweza nyuzi ya Polycarbonate)',
      'Kituo cha kulezea chenye ncha nzuri',
      'Ncha ya kuweka joto ya shaba (heat-set insert)',
      'Dereva za usahihi za Torx na heksi',
      'Mita ya umeme (multimeter)',
    ],
    assumptions: [
      'Intermediate surface mount soldering proficiency',
      'Familiarity with polycarbonate printing configurations',
    ],
    assumptionsSw: [
      'Ujuzi wa kuleza wa viungo vidogo vya elektroniki',
      'Kufahamiana na usanidi wa uchapishaji wa polycarbonate',
    ],
    fabrication: [
      {
        title: 'Polycarbonate Enclosure Print',
        titleSw: 'Chapisha Kasha la Polycarbonate',
        desc: 'Print the enclosure in high-strength polycarbonate with 4 walls and 30% infill for durability.',
        descSw: 'Chapisha kasha katika polycarbonate yenye kuta 4 na ujazo wa 30% kwa uimara.',
      },
    ],
    wiring: [
      {
        title: 'Solder Power Rails',
        titleSw: 'Leza Nyaya za Nguvu',
        desc: 'Connect the 18650 battery holder leads through the TP4056 charging module to the buck-boost converter.',
        descSw:
          'Unganisha nyaya za betri ya 18650 kupitia moduli ya TP4056 hadi kigeuzi cha TPS63060.',
      },
    ],
    bringup: [
      {
        title: 'Verify Cellular Sync',
        titleSw: 'Thibitisha Mawasiliano ya Simu',
        desc: 'Establish connection with LTE-M network and send mock temperature package to KilimoAI API.',
        descSw:
          'Weka mawasiliano na mtandao wa LTE-M na utume ujumbe wa majaribio ya joto kwenye API.',
      },
    ],
    assembly: [
      {
        title: 'Seal Perimeter',
        titleSw: 'Funga Kasha',
        desc: 'Install the Buna-N perimeter gasket and secure the housing using 4 security torx screws.',
        descSw: 'Weka gasket ya Buna-N ya ukingo na ufunge kasha kwa kutumia screws 4 za usalama.',
      },
    ],
  },
};

// No billing/payment gateway is wired up anywhere in this codebase for IoT
// subscriptions (same finding as upgrade.tsx: no payment edge function
// exists). Before this fix, handleSubscribe() showed "Subscription
// Activated! TSh 15,000/Month will be billed" with zero actual charge ever
// occurring — a fabricated billing confirmation. Flip this to true only once
// a real payment flow (server-verified webhook, subscription state written
// server-side on confirmed payment) actually exists.
const IOT_BILLING_LIVE = false;

export default function IOTSystems() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const agroId = useKilimoStore((s) => s.agroId);
  const addNotification = useKilimoStore((s) => s.addNotification);

  // Real users own zero IoT hardware until they register a device below —
  // INITIAL_DEVICES was fictional seed data (6 devices, incl. drones) shown
  // to every user as if already connected. Start empty; registered devices
  // are appended below via handleRegisterDevice.
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [droneActive, setDroneActive] = useState(false);
  const [irrigationActive, setIrrigationActive] = useState(true);

  // Modals
  const [showRegModal, setShowRegModal] = useState(false);
  const [showWaypointModal, setShowWaypointModal] = useState(false);
  const [regStep, setRegStep] = useState<'scan' | 'form' | 'success'>('scan');
  const [serialInput, setSerialInput] = useState('');
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [deviceTypeInput, setDeviceTypeInput] = useState<'SENSOR' | 'GATE' | 'WATER'>('SENSOR');
  const [selectedSubTier, setSelectedSubTier] = useState<'monthly' | 'yearly' | null>(null);

  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'specs' | 'guide'>('specs');
  const selectedDeviceData = selectedDevice ? HARDWARE_DATA[selectedDevice.id] : null;

  const handleDevicePress = (device: IoTDevice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDevice(device);
    setActiveDetailsTab('specs');
    setShowDetailsModal(true);
  };

  // Waypoint path
  const [waypoints, setWaypoints] = useState<string[]>([
    'Point A (Start): -6.7924, 39.2083',
    'Point B (Pasture): -6.7932, 39.2091',
    'Point C (Water Source): -6.7940, 39.2078',
    'Point D (North Boundary): -6.7915, 39.2069',
  ]);
  const [newWaypoint, setNewWaypoint] = useState('');

  // Pulse animation for active sensors
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );
  }, []);
  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleDroneToggle = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDroneActive(val);
  };

  const handleIrrigationToggle = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIrrigationActive(val);
  };

  // Device registration actions
  const startManualRegistration = () => {
    Haptics.selectionAsync();
    setRegStep('form');
  };

  const handleRegisterDevice = () => {
    if (!serialInput.trim()) {
      Alert.alert(
        language === 'sw' ? 'Namba ya Kifaa inahitajika' : 'Serial Number required',
        language === 'sw' ? 'Tafadhali weka serial number.' : 'Please input serial number.'
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newDevName = deviceNameInput.trim() || `${deviceTypeInput} Node ${devices.length + 1}`;
    const newIoTDevice: IoTDevice = {
      id: String(devices.length + 1),
      name: newDevName,
      nameSw: newDevName,
      type: deviceTypeInput,
      iconName:
        deviceTypeInput === 'SENSOR' ? 'zap' : deviceTypeInput === 'GATE' ? 'cpu' : 'droplets',
      battery: 100,
      latency: 75,
      lastSeen: 'Just now',
      lastSeenSw: 'Hivi sasa',
      status: 'active',
      serialNumber: serialInput.trim(),
      agroIdLinked: agroId?.id ?? 'AGRO-MAJ-920',
    };

    setDevices((prev) => [...prev, newIoTDevice]);
    setRegStep('success');
  };

  const handleSubscribe = (tier: 'monthly' | 'yearly') => {
    if (!IOT_BILLING_LIVE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      addNotification({
        title: language === 'sw' ? 'Bado Haipatikani' : 'Coming Soon',
        body:
          language === 'sw'
            ? 'Malipo ya huduma ya Premium IoT bado hayajawezeshwa. Hukutozwa chochote.'
            : 'Premium IoT billing is not live yet. You have not been charged.',
        type: 'warning',
      });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedSubTier(tier);
  };

  const handleAddWaypoint = () => {
    if (!newWaypoint.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWaypoints((prev) => [...prev, newWaypoint.trim()]);
    setNewWaypoint('');
  };

  const handleRemoveWaypoint = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWaypoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const getDeviceIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'zap':
        return <Zap size={16} color={color} />;
      case 'wind':
        return <Wind size={16} color={color} />;
      case 'droplets':
        return <Droplets size={16} color={color} />;
      case 'cpu':
        return <Cpu size={16} color={color} />;
      case 'tv':
        return <Tv size={16} color={color} />;
      default:
        return <Target size={16} color={color} />;
    }
  };

  const getDeviceColor = (type: string) => {
    switch (type) {
      case 'DRONE':
        return '#3b82f6';
      case 'SENSOR':
        return colors.primary;
      case 'WEATHER':
        return '#0ea5e9';
      case 'IRRIGATION':
        return '#a855f7';
      case 'GATE':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  };

  const getSignalBars = (latencyMs: number, color: string) => {
    const bars = latencyMs < 100 ? 3 : latencyMs < 150 ? 2 : 1;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        {[5, 8, 11].map((h, idx) => (
          <View
            key={idx}
            style={{
              width: 3,
              height: h,
              borderRadius: 1.5,
              backgroundColor:
                idx < bars ? color : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            }}
          />
        ))}
      </View>
    );
  };

  const getDeviceBatBar = (pct: number) => {
    const col = pct > 60 ? colors.primary : pct > 30 ? '#f59e0b' : '#ef4444';
    return (
      <View
        style={{
          width: 40,
          height: 4,
          borderRadius: 3,
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{ width: `${pct}%` as any, height: '100%', backgroundColor: col, borderRadius: 3 }}
        />
      </View>
    );
  };

  return (
    <Gate
      feature="iot_systems"
      fallback={
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                style={[
                  styles.iconButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Rudi nyuma' : 'Go back'}
              >
                <ChevronLeft size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Mifumo ya IoT & Drones' : 'IoT & Drone Systems'}
              </Text>
              <View style={{ width: 44 }} />
            </View>
            <View style={{ padding: 24, alignItems: 'center', gap: 12, marginTop: 40 }}>
              <ShieldCheck size={32} color={colors.textMute} />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: 'Inter_700Bold',
                  color: colors.text,
                  textAlign: 'center',
                }}
              >
                {language === 'sw' ? 'Hairuhusiwi' : 'Not Available'}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter_500Medium',
                  color: colors.textMute,
                  textAlign: 'center',
                  lineHeight: 19,
                }}
              >
                {language === 'sw'
                  ? 'Mifumo ya IoT & Drones inapatikana kwa Wakulima wa Biashara, Wasimamizi wa Shamba, na Kampuni za Kilimo.'
                  : 'IoT & Drone Systems is available to Commercial Farmers, Farm Managers, and Agribusinesses.'}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      }
    >
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ImageBackground
        source={require('../assets/images/welcome_bg.png')}
        style={StyleSheet.absoluteFillObject}
      >
        <LinearGradient
          colors={[
            isDark ? 'rgba(18,26,15,0.85)' : 'rgba(255,255,255,0.7)',
            isDark ? '#121A0F' : '#FCFBF7',
          ]}
          style={StyleSheet.absoluteFillObject}
          locations={[0, 0.45]}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[
              styles.iconButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel={language === 'sw' ? 'Rudi nyuma' : 'Go back'}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {language === 'sw' ? 'Mifumo ya IoT & Drones' : 'IoT & Drone Systems'}
          </Text>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            accessibilityRole="button"
            accessibilityLabel={language === 'sw' ? 'Mipangilio' : 'Settings'}
          >
            <Settings size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Prototype notice — the Drone Control, Smart Irrigation, Field
            Sensors, and RIFT HerdTag panels below simulate hardware you
            don't yet own (no BLE/MQTT pairing or IoT backend exists in this
            codebase). Toggling them changes only local screen state, not
            any real device. Real hardware integration is a separate
            architectural decision (device shadow service, broker, drone
            flight-control API) — flagged, not invented here. */}
        <View
          style={[
            styles.protoBanner,
            { backgroundColor: '#f59e0b18', borderColor: '#f59e0b40' },
          ]}
        >
          <Text style={[styles.protoBannerText, { color: '#b45309' }]}>
            {language === 'sw'
              ? 'ONYESHO LA MFANO — vidhibiti hapa chini ni onyesho tu, hakuna maunzi halisi yaliyounganishwa.'
              : 'PROTOTYPE — the controls below are a simulation; no real hardware is connected.'}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Device Hub — Connection Status */}
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <View
              style={[
                styles.deviceHubBanner,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.deviceHubHeader, { backgroundColor: colors.primary + '0F' }]}>
                <View style={styles.deviceHubTitleRow}>
                  <Animated.View
                    style={[
                      styles.searchingDot,
                      animatedPulse,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                  <Text style={[styles.deviceHubTitle, { color: colors.text }]}>
                    {language === 'sw' ? 'KITUO CHA VIFAA' : 'DEVICE HUB'}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 8,
                      backgroundColor: colors.primary + '26',
                      marginLeft: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontFamily: 'Inter_800ExtraBold',
                        color: colors.primary,
                      }}
                    >
                      {devices.length} ONLINE
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setRegStep('scan');
                    setSerialInput('');
                    setDeviceNameInput('');
                    setShowRegModal(true);
                  }}
                  style={styles.registerFab}
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'sw' ? 'Sajili kifaa kipya' : 'Register new device'
                  }
                >
                  <Plus size={12} color="#fff" />
                  <Text style={styles.registerFabText}>
                    {language === 'sw' ? 'Sajili' : 'Register'}
                  </Text>
                </TouchableOpacity>
              </View>

              {devices.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                  <Radio size={28} color={colors.textMute} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: 'Inter_600SemiBold',
                      color: colors.text,
                      textAlign: 'center',
                    }}
                  >
                    {language === 'sw' ? 'Hakuna Kifaa Bado' : 'No Devices Yet'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Inter_500Medium',
                      color: colors.textMute,
                      textAlign: 'center',
                    }}
                  >
                    {language === 'sw'
                      ? 'Bonyeza "Sajili" hapo juu kuongeza kifaa chako cha kwanza.'
                      : 'Tap "Register" above to add your first device.'}
                  </Text>
                </View>
              )}

              {devices.map((device, i) => {
                const color = getDeviceColor(device.type);
                const batColor =
                  device.battery > 60
                    ? colors.primary
                    : device.battery > 30
                      ? '#f59e0b'
                      : '#ef4444';
                const typeLabelMap: Record<string, string> = {
                  DRONE: 'DRONE',
                  SENSOR: 'SENSOR',
                  WEATHER: 'WEATHER',
                  IRRIGATION: 'IRRIG',
                  GATE: 'GATE',
                  WATER: 'MAJI',
                };
                const typeLabel = typeLabelMap[device.type] ?? device.type;
                return (
                  <TouchableOpacity
                    key={device.id}
                    onPress={() => handleDevicePress(device)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      language === 'sw'
                        ? `Fungua maelezo ya ${device.nameSw}`
                        : `Open details for ${device.name}`
                    }
                    style={{
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Animated.View
                      entering={FadeInDown.delay(80 + i * 50).springify()}
                      style={[styles.deviceRow, { borderTopWidth: 0 }]}
                    >
                      <View style={[styles.deviceIconBox, { backgroundColor: color + '18' }]}>
                        {getDeviceIcon(device.iconName, color)}
                      </View>
                      <View style={[styles.deviceInfo, { gap: 5 }]}>
                        {/* Name + type pill */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={[styles.deviceName, { color: colors.text, flex: 1 }]}
                            numberOfLines={1}
                          >
                            {language === 'sw' ? device.nameSw : device.name}
                          </Text>
                          <View
                            style={{
                              paddingHorizontal: 5,
                              paddingVertical: 2,
                              borderRadius: 5,
                              backgroundColor: color + '18',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 8,
                                fontFamily: 'Inter_700Bold',
                                color,
                                letterSpacing: 0.6,
                              }}
                            >
                              {typeLabel}
                            </Text>
                          </View>
                        </View>
                        {/* Telemetry strip */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {getDeviceBatBar(device.battery)}
                          <Text
                            style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: batColor }}
                          >
                            {device.battery}%
                          </Text>
                          <View
                            style={{
                              width: 1,
                              height: 9,
                              backgroundColor: colors.border,
                              marginHorizontal: 1,
                            }}
                          />
                          {getSignalBars(device.latency, color)}
                          <Text style={{ flex: 1 }} />
                          <Text
                            style={{
                              fontSize: 9,
                              fontFamily: 'Inter_500Medium',
                              color: colors.textMute,
                            }}
                          >
                            {language === 'sw' ? device.lastSeenSw : device.lastSeen}
                          </Text>
                        </View>
                      </View>
                      <Animated.View
                        style={[
                          { width: 8, height: 8, borderRadius: 4, marginLeft: 10 },
                          animatedPulse,
                          {
                            backgroundColor:
                              device.status === 'active' ? colors.primary : '#94a3b8',
                          },
                        ]}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}

              <View style={[styles.deviceHubFooter, { borderTopColor: colors.border }]}>
                <Animated.View
                  style={[
                    { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
                    animatedPulse,
                  ]}
                />
                <Text style={[styles.deviceHubFooterText, { color: colors.textMute }]}>
                  {devices.length > 0
                    ? language === 'sw'
                      ? 'Salama · LoRaWAN + 4G LTE · Vifaa vyote vinajibu'
                      : 'Encrypted · LoRaWAN + 4G LTE · All nodes responding'
                    : language === 'sw'
                      ? 'Hakuna kifaa kilichosajiliwa'
                      : 'No devices registered'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Drone Control Panel */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.textMute }]}>
              {language === 'sw' ? 'DRONE CONTROL' : 'DRONE CONTROL'}
            </Text>

            <View
              style={[
                styles.glassCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.iconBadge, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                    <Target size={20} color="#3b82f6" />
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>AD-40 AgriDrone</Text>
                    <Text style={[styles.cardSubtitle, { color: '#3b82f6' }]}>
                      {droneActive
                        ? language === 'sw'
                          ? 'Iko Hewani'
                          : 'In Flight'
                        : language === 'sw'
                          ? 'Ipo Kituoni'
                          : 'Standby'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={droneActive}
                  onValueChange={handleDroneToggle}
                  trackColor={{ false: colors.border, true: '#3b82f6' }}
                  thumbColor="#fff"
                  accessibilityLabel={
                    language === 'sw' ? 'Washa au zima drone' : 'Toggle agricultural drone'
                  }
                />
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <BatteryCharging size={18} color="#22c55e" />
                  <Text
                    style={[
                      styles.statValue,
                      { color: colors.text, fontFamily: 'InstrumentSerif_400Regular' },
                    ]}
                  >
                    84%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMute }]}>BATTERY</Text>
                </View>
                <View style={styles.statBox}>
                  <Wifi size={18} color="#3b82f6" />
                  <Text
                    style={[
                      styles.statValue,
                      { color: colors.text, fontFamily: 'InstrumentSerif_400Regular' },
                    ]}
                  >
                    92 ms
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMute }]}>LATENCY</Text>
                </View>
                <View style={styles.statBox}>
                  <Droplets size={18} color="#0ea5e9" />
                  <Text
                    style={[
                      styles.statValue,
                      { color: colors.text, fontFamily: 'InstrumentSerif_400Regular' },
                    ]}
                  >
                    12 L
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMute }]}>PAYLOAD</Text>
                </View>
              </View>

              <View style={styles.droneActions}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: droneActive ? '#ef4444' : colors.primary },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setDroneActive(!droneActive);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    droneActive
                      ? language === 'sw'
                        ? 'Tua drone sasa'
                        : 'Land agricultural drone now'
                      : language === 'sw'
                        ? 'Rusha drone sasa'
                        : 'Launch agricultural drone now'
                  }
                >
                  {droneActive ? (
                    <PlaneLanding size={18} color="#fff" />
                  ) : (
                    <PlaneTakeoff size={18} color={isDark ? '#000' : '#fff'} />
                  )}
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: droneActive ? '#fff' : isDark ? '#000' : '#fff' },
                    ]}
                  >
                    {droneActive
                      ? language === 'sw'
                        ? 'Tua Sasa'
                        : 'Land Now'
                      : language === 'sw'
                        ? 'Rusha Drone'
                        : 'Launch Drone'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtnSecondary, { borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowWaypointModal(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'sw' ? 'Chora au panga njia ya drone' : 'Plan drone waypoints'
                  }
                >
                  <Map size={18} color={colors.text} />
                  <Text style={[styles.actionBtnTextSecondary, { color: colors.text }]}>
                    {language === 'sw' ? 'Chora Njia' : 'Waypoints'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Premium Subscription Module */}
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.textMute }]}>
              {language === 'sw' ? 'PREMIUM CARE' : 'PREMIUM CARE'}
            </Text>

            <View
              style={[
                styles.glassCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={{ gap: 4, marginBottom: 12 }}>
                <Text style={[styles.subTitleText, { color: colors.text }]}>
                  {language === 'sw'
                    ? 'KilimoAI Premium IoT Subscription'
                    : 'KilimoAI Premium IoT Subscription'}
                </Text>
                <Text style={[styles.subBodyText, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'Pata huduma ya saa 24, mafundi shamba nyumbani kwako ndani ya masaa 12, na kubadilishiwa kifaa kikiharibika.'
                    : 'Get 24/7 remote monitoring, field technicians on-site within 12 hours, and replacement parts warranty.'}
                </Text>
              </View>

              <View style={styles.subTierRow}>
                <TouchableOpacity
                  onPress={() => handleSubscribe('monthly')}
                  style={[
                    styles.subTierBox,
                    {
                      borderColor: selectedSubTier === 'monthly' ? colors.primary : colors.border,
                      backgroundColor:
                        selectedSubTier === 'monthly' ? colors.primary + '0F' : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'sw'
                      ? 'Kifurushi cha Kila Mwezi, TSh 15,000 kwa mwezi'
                      : 'Monthly tier, 15,000 Shillings per month'
                  }
                  accessibilityState={{ selected: selectedSubTier === 'monthly' }}
                >
                  <Text style={[styles.subTierName, { color: colors.text }]}>
                    {language === 'sw' ? 'Kila Mwezi' : 'Monthly'}
                  </Text>
                  <Text style={[styles.subTierPrice, { color: colors.primary }]}>TSh 15,000</Text>
                  <Text style={[styles.subTierPeriod, { color: colors.textMute }]}>/ mwezi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSubscribe('yearly')}
                  style={[
                    styles.subTierBox,
                    {
                      borderColor: selectedSubTier === 'yearly' ? colors.primary : colors.border,
                      backgroundColor:
                        selectedSubTier === 'yearly' ? colors.primary + '0F' : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'sw'
                      ? 'Kifurushi cha Kila Mwaka, TSh 150,000 kwa mwaka'
                      : 'Annual tier, 150,000 Shillings per year'
                  }
                  accessibilityState={{ selected: selectedSubTier === 'yearly' }}
                >
                  <Text style={[styles.subTierName, { color: colors.text }]}>
                    {language === 'sw' ? 'Kila Mwaka' : 'Annual'}
                  </Text>
                  <Text style={[styles.subTierPrice, { color: colors.primary }]}>TSh 150,000</Text>
                  <Text style={[styles.subTierPeriod, { color: colors.textMute }]}>/ mwaka</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Smart Irrigation */}
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.textMute }]}>
              {language === 'sw' ? 'SMART IRRIGATION' : 'SMART IRRIGATION'}
            </Text>

            <View
              style={[
                styles.glassCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Animated.View
                    style={[
                      styles.iconBadge,
                      { backgroundColor: 'rgba(14,165,233,0.1)' },
                      irrigationActive && animatedPulse,
                    ]}
                  >
                    <CloudRain size={20} color="#0ea5e9" />
                  </Animated.View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {language === 'sw' ? 'Bomba Kuu · Kanda 1–4' : 'Main Valve · Zones 1–4'}
                    </Text>
                    <Text
                      style={[
                        styles.cardSubtitle,
                        { color: irrigationActive ? '#0ea5e9' : colors.textMute },
                      ]}
                    >
                      {irrigationActive
                        ? language === 'sw'
                          ? 'Inamwagilia (2.4L/s)'
                          : 'Active (2.4L/s)'
                        : language === 'sw'
                          ? 'Imezimwa'
                          : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={irrigationActive}
                  onValueChange={handleIrrigationToggle}
                  trackColor={{ false: colors.border, true: '#0ea5e9' }}
                  thumbColor="#fff"
                  accessibilityLabel={
                    language === 'sw' ? 'Washa au zima umwagiliaji' : 'Toggle smart irrigation'
                  }
                />
              </View>

              <View style={styles.irrigationStats}>
                <View style={styles.iStat}>
                  <Text style={[styles.iStatLabel, { color: colors.textMute }]}>
                    {language === 'sw' ? 'Unyevu wa Udongo' : 'Soil Moisture'}
                  </Text>
                  <Text
                    style={[
                      styles.iStatValue,
                      { color: colors.text, fontFamily: 'InstrumentSerif_400Regular' },
                    ]}
                  >
                    42%{' '}
                    <Text
                      style={{ color: '#ef4444', fontSize: 12, fontFamily: 'Inter_600SemiBold' }}
                    >
                      LOW
                    </Text>
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[styles.progressBarFill, { width: '42%', backgroundColor: '#ef4444' }]}
                    />
                  </View>
                </View>
                <View style={styles.iStat}>
                  <Text style={[styles.iStatLabel, { color: colors.textMute }]}>
                    {language === 'sw' ? 'Lengo la Unyevu' : 'Target Moisture'}
                  </Text>
                  <Text
                    style={[
                      styles.iStatValue,
                      { color: colors.text, fontFamily: 'InstrumentSerif_400Regular' },
                    ]}
                  >
                    65%
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[styles.progressBarFill, { width: '65%', backgroundColor: '#22c55e' }]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Environmental Sensors */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.textMute }]}>
              {language === 'sw' ? 'FIELD SENSORS' : 'FIELD SENSORS'}
            </Text>

            <View style={styles.sensorsGrid}>
              {(
                [
                  {
                    icon: <Wind size={22} color="#a855f7" />,
                    label: language === 'sw' ? 'Upepo' : 'Wind Speed',
                    value: '14 km/h',
                    trend: '↑ +2',
                    trendColor: '#f59e0b',
                    color: '#a855f7',
                  },
                  {
                    icon: <Zap size={22} color="#f59e0b" />,
                    label: language === 'sw' ? 'Joto la Udongo' : 'Soil Temp',
                    value: '24°C',
                    trend: language === 'sw' ? '→ Imara' : '→ Stable',
                    trendColor: colors.primary,
                    color: '#f59e0b',
                  },
                  {
                    icon: <Droplets size={22} color="#3b82f6" />,
                    label: 'pH Level',
                    value: '6.4',
                    trend: '↑ Optimal',
                    trendColor: colors.primary,
                    color: '#3b82f6',
                  },
                  {
                    icon: <Target size={22} color="#22c55e" />,
                    label: 'N · P · K',
                    value: language === 'sw' ? 'Bora' : 'Optimal',
                    trend: language === 'sw' ? '✓ Sawa' : '✓ Balanced',
                    trendColor: colors.primary,
                    color: '#22c55e',
                  },
                ] as {
                  icon: React.ReactNode;
                  label: string;
                  value: string;
                  trend: string;
                  trendColor: string;
                  color: string;
                }[]
              ).map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.sensorCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.sensorIcon, { backgroundColor: s.color + '15' }]}>
                    {s.icon}
                  </View>
                  <Text
                    style={[
                      styles.sensorValue,
                      { color: colors.text, fontFamily: 'InstrumentSerif_400Regular' },
                    ]}
                  >
                    {s.value}
                  </Text>
                  <Text style={[styles.sensorLabel, { color: colors.textMute }]}>{s.label}</Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: 'Inter_600SemiBold',
                      color: s.trendColor,
                      marginTop: 5,
                    }}
                  >
                    {s.trend}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
          {/* RIFT HerdTag Section */}
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.textMute }]}>
              {language === 'sw'
                ? 'RIFT HerdTag™ · Ufuatiliaji wa Mifugo'
                : 'RIFT HerdTag™ · Livestock Tracking'}
            </Text>
            <View
              style={[
                styles.glassCard,
                { backgroundColor: colors.card, borderColor: '#2E6F4030', borderWidth: 1.5 },
              ]}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.iconBadge, { backgroundColor: colors.primary + '1A' }]}>
                    <Target size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>RIFT HerdTag™</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.primary }]}>
                      {language === 'sw'
                        ? 'Masikio Smart · 4G + BLE + GPS'
                        : 'Smart Ear Tag · 4G + BLE + GPS'}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Animated.View
                      style={[
                        styles.statusPulseDot,
                        animatedPulse,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text
                      style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.primary }}
                    >
                      {language === 'sw' ? '1 IMESAJILIWA' : '1 REGISTERED'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Tag metrics */}
              <View style={[styles.statsRow, { marginTop: 0, marginBottom: 16 }]}>
                {[
                  { label: language === 'sw' ? 'Wanyama' : 'Animals', value: '3' },
                  { label: language === 'sw' ? 'Tag Hai' : 'Tags Active', value: '1' },
                  { label: language === 'sw' ? 'Maonyo' : 'Alerts', value: '0' },
                ].map((s) => (
                  <View key={s.label} style={styles.statBox}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMute }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Registered tag */}
              <View style={{ gap: 8 }}>
                {[
                  {
                    tag: 'TZ-0421',
                    species: language === 'sw' ? "Ng'ombe" : 'Cattle',
                    name: 'Sita',
                    lat: -3.3869,
                    lng: 36.683,
                    heartRate: 68,
                    temp: 38.2,
                    battery: 87,
                    active: true,
                  },
                  {
                    tag: 'TZ-0422',
                    species: language === 'sw' ? "Ng'ombe" : 'Cattle',
                    name: 'Bahati',
                    lat: -3.3871,
                    lng: 36.6832,
                    heartRate: 72,
                    temp: 38.5,
                    battery: 72,
                    active: false,
                  },
                  {
                    tag: 'GT-118',
                    species: language === 'sw' ? 'Mbuzi' : 'Goat',
                    name: '—',
                    lat: -3.3875,
                    lng: 36.6828,
                    heartRate: 82,
                    temp: 39.1,
                    battery: 95,
                    active: false,
                  },
                ].map((a) => (
                  <View
                    key={a.tag}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        backgroundColor: a.active ? colors.primary + '0D' : 'rgba(0,0,0,0.02)',
                        borderColor: a.active ? '#2E6F4040' : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.deviceIconBox,
                        { backgroundColor: a.active ? '#2E6F4018' : colors.background },
                      ]}
                    >
                      <BatteryCharging
                        size={16}
                        color={a.active ? colors.primary : colors.textMute}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.deviceName, { color: colors.text }]}>
                        {a.tag} · {a.name} ({a.species})
                      </Text>
                      {a.active ? (
                        <View
                          style={{ flexDirection: 'row', gap: 5, marginTop: 4, flexWrap: 'wrap' }}
                        >
                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                              backgroundColor: 'rgba(239,68,68,0.1)',
                            }}
                          >
                            <Text
                              style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#ef4444' }}
                            >
                              {a.heartRate} bpm
                            </Text>
                          </View>
                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                              backgroundColor: 'rgba(245,158,11,0.1)',
                            }}
                          >
                            <Text
                              style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#f59e0b' }}
                            >
                              {a.temp}°C
                            </Text>
                          </View>
                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                              backgroundColor: colors.primary + '1A',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                fontFamily: 'Inter_700Bold',
                                color: colors.primary,
                              }}
                            >
                              {a.battery}%
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={[styles.deviceType, { color: colors.textMute }]}>
                          {language === 'sw' ? 'Haijasajiliwa bado' : 'Not registered yet'}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.deviceStatusRow]}>
                      <View
                        style={[
                          styles.statusPulseDot,
                          { backgroundColor: a.active ? colors.primary : '#94a3b8' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.deviceStatusText,
                          { color: a.active ? colors.primary : '#94a3b8' },
                        ]}
                      >
                        {a.active
                          ? language === 'sw'
                            ? 'Hai'
                            : 'Live'
                          : language === 'sw'
                            ? 'Tumisha'
                            : 'Activate'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
                style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Ona ramani ya mifugo' : 'View Herd Map'}
              >
                <Map size={16} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>
                  {language === 'sw' ? 'Ona Ramani ya Mifugo' : 'View Herd Map'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Waypoints Planning Modal */}
      <Modal
        visible={showWaypointModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWaypointModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Njia ya Ndege (Waypoints)' : 'Flight Waypoints'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowWaypointModal(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Funga' : 'Close'}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8 }}>
              {waypoints.map((pt, idx) => (
                <View key={idx} style={[styles.waypointRow, { borderColor: colors.border }]}>
                  <Text style={[styles.waypointText, { color: colors.text }]}>{pt}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveWaypoint(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Ondoa waypoint' : 'Remove waypoint'}
                  >
                    <X size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.waypointInputRow}>
              <TextInput
                value={newWaypoint}
                onChangeText={setNewWaypoint}
                placeholder="e.g. -6.7952, 39.2100"
                placeholderTextColor={colors.textMute}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                accessibilityLabel={language === 'sw' ? 'Njia mpya ya drone' : 'New waypoint'}
                accessibilityHint={
                  language === 'sw' ? 'Weka viwianishi vya eneo' : 'Enter location coordinates'
                }
              />
              <TouchableOpacity
                onPress={handleAddWaypoint}
                style={[styles.addWaypointBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Ongeza njia' : 'Add waypoint'}
              >
                <Plus size={16} color="#000" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowWaypointModal(false);
                Alert.alert(
                  language === 'sw' ? 'Njia Imetumwa!' : 'Path Uploaded!',
                  language === 'sw'
                    ? 'Gridi ya usambazaji imehamishiwa kwenye Drone.'
                    : 'Waypoints grid path uploaded to drone flight deck.'
                );
              }}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={language === 'sw' ? 'Tuma Kwenye Drone' : 'Upload to Drone'}
            >
              <Text style={styles.saveBtnText}>
                {language === 'sw' ? 'Tuma Kwenye Drone' : 'Upload to Drone'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Device Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.text, fontFamily: 'InstrumentSerif_400Regular', fontSize: 24 },
                ]}
                numberOfLines={1}
              >
                {selectedDevice
                  ? language === 'sw'
                    ? selectedDevice.nameSw
                    : selectedDevice.name
                  : ''}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Funga' : 'Close'}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={styles.detailTabRow}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveDetailsTab('specs');
                }}
                style={[
                  styles.detailTabButton,
                  activeDetailsTab === 'specs' && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Vipimo' : 'Specifications'}
                accessibilityState={{ selected: activeDetailsTab === 'specs' }}
              >
                <Text
                  style={[
                    styles.detailTabButtonText,
                    { color: activeDetailsTab === 'specs' ? colors.primary : colors.textMute },
                  ]}
                >
                  {language === 'sw' ? 'Vipimo' : 'Specifications'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveDetailsTab('guide');
                }}
                style={[
                  styles.detailTabButton,
                  activeDetailsTab === 'guide' && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Mwongozo' : 'Assembly Guide'}
                accessibilityState={{ selected: activeDetailsTab === 'guide' }}
              >
                <Text
                  style={[
                    styles.detailTabButtonText,
                    { color: activeDetailsTab === 'guide' ? colors.primary : colors.textMute },
                  ]}
                >
                  {language === 'sw' ? 'Mwongozo' : 'Assembly Guide'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 24, gap: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {selectedDeviceData ? (
                activeDetailsTab === 'specs' ? (
                  /* Specs Tab */
                  <View style={{ gap: 16 }}>
                    {selectedDeviceData.specs.map((spec, index) => (
                      <View
                        key={index}
                        style={[styles.specItemCard, { borderColor: colors.border }]}
                      >
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.specName, { color: colors.text }]}>
                            {language === 'sw' ? spec.nameSw : spec.name}
                          </Text>
                          <Text style={[styles.specProduct, { color: colors.textMute }]}>
                            {spec.product}
                          </Text>
                          <Text style={[styles.specDesc, { color: colors.textMute }]}>
                            {language === 'sw' ? spec.descSw : spec.desc}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 8, minWidth: 90 }}>
                          <Text style={[styles.specCost, { color: colors.text }]}>
                            {language === 'sw' ? spec.costSw : spec.cost}
                          </Text>
                          {spec.url && (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(spec.url!)}
                              style={[styles.buyBtn, { backgroundColor: colors.primary }]}
                              accessibilityRole="button"
                              accessibilityLabel={
                                language === 'sw' ? `Nunua ${spec.name}` : `Buy ${spec.name}`
                              }
                            >
                              <Text style={styles.buyBtnText}>
                                {language === 'sw' ? 'Nunua' : 'Buy'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}

                    {/* Tools Card */}
                    <View style={[styles.toolsCard, { borderColor: colors.border }]}>
                      <Text style={[styles.toolsTitle, { color: colors.text }]}>
                        {language === 'sw' ? 'Vifaa Vinavyohitajika' : 'Required Assembly Tools'}
                      </Text>
                      {(language === 'sw'
                        ? selectedDeviceData.toolsSw
                        : selectedDeviceData.tools
                      ).map((tool, index) => (
                        <Text key={index} style={[styles.toolBullet, { color: colors.text }]}>
                          • {tool}
                        </Text>
                      ))}
                    </View>

                    {/* Assumptions Card */}
                    <View style={[styles.assumptionsCard, { borderColor: colors.border }]}>
                      <Text style={[styles.assumptionsTitle, { color: colors.text }]}>
                        {language === 'sw'
                          ? 'Prerequisites na Kudhania'
                          : 'Prerequisites & Assumptions'}
                      </Text>
                      {(language === 'sw'
                        ? selectedDeviceData.assumptionsSw
                        : selectedDeviceData.assumptions
                      ).map((asm, index) => (
                        <Text key={index} style={[styles.assumptionBullet, { color: colors.text }]}>
                          • {asm}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : (
                  /* Guide Tab */
                  <View style={{ gap: 20 }}>
                    {/* Assembly Section */}
                    {selectedDeviceData.assembly && selectedDeviceData.assembly.length > 0 && (
                      <View style={styles.guideSectionCard}>
                        <Text style={[styles.guideSectionTitle, { color: colors.primary }]}>
                          {language === 'sw'
                            ? '1. Uunganishaji (Assembly)'
                            : '1. Physical Assembly'}
                        </Text>
                        {selectedDeviceData.assembly.map((step, idx) => (
                          <View
                            key={idx}
                            style={[styles.stepItemCard, { borderColor: colors.border }]}
                          >
                            <View style={[styles.stepItemNum, { backgroundColor: colors.primary }]}>
                              <Text
                                style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 12 }}
                              >
                                {idx + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={[styles.stepItemTitle, { color: colors.text }]}>
                                {language === 'sw' ? step.titleSw : step.title}
                              </Text>
                              <Text style={[styles.stepItemText, { color: colors.textMute }]}>
                                {language === 'sw' ? step.descSw : step.desc}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Wiring Section */}
                    {selectedDeviceData.wiring && selectedDeviceData.wiring.length > 0 && (
                      <View style={styles.guideSectionCard}>
                        <Text style={[styles.guideSectionTitle, { color: colors.primary }]}>
                          {language === 'sw'
                            ? '2. Uunganishaji Waya (Wiring)'
                            : '2. Electrical Wiring'}
                        </Text>
                        {selectedDeviceData.wiring.map((step, idx) => (
                          <View
                            key={idx}
                            style={[styles.stepItemCard, { borderColor: colors.border }]}
                          >
                            <View style={[styles.stepItemNum, { backgroundColor: colors.primary }]}>
                              <Text
                                style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 12 }}
                              >
                                {idx + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={[styles.stepItemTitle, { color: colors.text }]}>
                                {language === 'sw' ? step.titleSw : step.title}
                              </Text>
                              <Text style={[styles.stepItemText, { color: colors.textMute }]}>
                                {language === 'sw' ? step.descSw : step.desc}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Fabrication Section */}
                    {selectedDeviceData.fabrication &&
                      selectedDeviceData.fabrication.length > 0 && (
                        <View style={styles.guideSectionCard}>
                          <Text style={[styles.guideSectionTitle, { color: colors.primary }]}>
                            {language === 'sw'
                              ? '3. Kazi za Viwanda (Fabrication)'
                              : '3. Custom Fabrication'}
                          </Text>
                          {selectedDeviceData.fabrication.map((step, idx) => (
                            <View
                              key={idx}
                              style={[styles.stepItemCard, { borderColor: colors.border }]}
                            >
                              <View
                                style={[styles.stepItemNum, { backgroundColor: colors.primary }]}
                              >
                                <Text
                                  style={{
                                    color: '#000',
                                    fontFamily: 'Inter_700Bold',
                                    fontSize: 12,
                                  }}
                                >
                                  {idx + 1}
                                </Text>
                              </View>
                              <View style={{ flex: 1, gap: 2 }}>
                                <Text style={[styles.stepItemTitle, { color: colors.text }]}>
                                  {language === 'sw' ? step.titleSw : step.title}
                                </Text>
                                <Text style={[styles.stepItemText, { color: colors.textMute }]}>
                                  {language === 'sw' ? step.descSw : step.desc}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                    {/* Bring-up Section */}
                    {selectedDeviceData.bringup && selectedDeviceData.bringup.length > 0 && (
                      <View style={styles.guideSectionCard}>
                        <Text style={[styles.guideSectionTitle, { color: colors.primary }]}>
                          {language === 'sw'
                            ? '4. Uwashaji wa Mwanzo (Bring-Up)'
                            : '4. Initial Bring-Up & Calibration'}
                        </Text>
                        {selectedDeviceData.bringup.map((step, idx) => (
                          <View
                            key={idx}
                            style={[styles.stepItemCard, { borderColor: colors.border }]}
                          >
                            <View style={[styles.stepItemNum, { backgroundColor: colors.primary }]}>
                              <Text
                                style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 12 }}
                              >
                                {idx + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={[styles.stepItemTitle, { color: colors.text }]}>
                                {language === 'sw' ? step.titleSw : step.title}
                              </Text>
                              <Text style={[styles.stepItemText, { color: colors.textMute }]}>
                                {language === 'sw' ? step.descSw : step.desc}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )
              ) : (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text
                    style={{
                      color: colors.textMute,
                      textAlign: 'center',
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 14,
                    }}
                  >
                    {language === 'sw'
                      ? 'Hakuna maelezo ya kina ya kifaa hiki cha kienyeji/manually.'
                      : 'No build specifications available for manually added hardware.'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QR Registration Modal */}
      <Modal
        visible={showRegModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Sajili Kifaa Mpya' : 'Register New Device'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowRegModal(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Funga' : 'Close'}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {regStep === 'scan' && (
              <View style={styles.scannerWrapper}>
                <View style={styles.cameraBox}>
                  <QrCode size={120} color={colors.textMute} strokeWidth={1} />
                  <Animated.View style={[styles.scannerLaser, { borderColor: colors.primary }]} />
                  <Text style={[styles.scannerDescText, { color: colors.textMute }]}>
                    {language === 'sw'
                      ? 'Sogeza QR Code karibu na Kamera'
                      : 'Align QR Code within the frame'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={startManualRegistration}
                  style={[styles.manualBtn, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'sw'
                      ? 'Weka namba ya utambulisho kwa mkono'
                      : 'Enter serial number manually'
                  }
                >
                  <Text style={[styles.manualBtnText, { color: colors.text }]}>
                    {language === 'sw'
                      ? 'Weka Serial Number kwa Mkono'
                      : 'Enter Serial Number Manually'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {regStep === 'form' && (
              <ScrollView contentContainerStyle={{ gap: 14 }}>
                <Text style={[styles.inputLabel, { color: colors.textMute }]}>
                  {language === 'sw' ? 'AINA YA KIFAA' : 'DEVICE TYPE'}
                </Text>
                <View style={styles.typeOptionRow}>
                  {(['SENSOR', 'GATE', 'WATER'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setDeviceTypeInput(type)}
                      style={[
                        styles.typeOptionBox,
                        {
                          borderColor: deviceTypeInput === type ? colors.primary : colors.border,
                          backgroundColor:
                            deviceTypeInput === type ? colors.primary + '14' : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={type}
                      accessibilityState={{ selected: deviceTypeInput === type }}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          { color: deviceTypeInput === type ? colors.primary : colors.textMute },
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.textMute }]}>
                  {language === 'sw' ? 'JINA LA KIFAA' : 'DEVICE NAME'}
                </Text>
                <TextInput
                  value={deviceNameInput}
                  onChangeText={setDeviceNameInput}
                  placeholder="e.g. Sensori ya Udongo Mashariki"
                  placeholderTextColor={colors.textMute}
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                  accessibilityLabel={language === 'sw' ? 'Jina la kifaa' : 'Device name'}
                  accessibilityHint={
                    language === 'sw' ? 'Weka jina la kifaa chako' : 'Enter name for your device'
                  }
                />

                <Text style={[styles.inputLabel, { color: colors.textMute }]}>
                  {language === 'sw' ? 'NAMBA YA KITAMBULISHO (S/N)' : 'SERIAL NUMBER (S/N)'}
                </Text>
                <TextInput
                  value={serialInput}
                  onChangeText={setSerialInput}
                  placeholder="e.g. RIFT-SM-9041"
                  placeholderTextColor={colors.textMute}
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                  accessibilityLabel={language === 'sw' ? 'Namba ya utambulisho' : 'Serial number'}
                  accessibilityHint={
                    language === 'sw'
                      ? 'Weka namba ya utambulisho ya kifaa'
                      : 'Enter device serial number'
                  }
                />

                <View style={styles.linkAlert}>
                  <CheckCircle2 size={16} color={colors.primary} />
                  <Text style={[styles.linkAlertText, { color: colors.textMute }]}>
                    {language === 'sw'
                      ? `Kifaa hiki kitaunganishwa kiotomatiki na Agro ID yako: ${agroId?.name ?? 'Justin Mafie'}`
                      : `This device will link automatically to your Agro ID: ${agroId?.name ?? 'Justin Mafie'}`}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleRegisterDevice}
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'sw' ? 'Sajili kifaa sasa' : 'Register device now'
                  }
                >
                  <Text style={styles.saveBtnText}>
                    {language === 'sw' ? 'Sajili Kifaa' : 'Register Device'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {regStep === 'success' && (
              <View style={styles.successWrapper}>
                <CheckCircle2 size={64} color={colors.primary} />
                <Text style={[styles.successTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Kifaa Kimeongezwa!' : 'Device Added!'}
                </Text>
                <Text style={[styles.successDesc, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'Kifaa chako kimeongezwa kwenye orodha yako. Hii ni onyesho la mfano — hakuna muunganisho wa kweli wa maunzi bado.'
                    : 'Your device has been added to your list. This is a prototype interface — there is no real hardware connection yet.'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowRegModal(false);
                    setRegStep('scan');
                  }}
                  style={[
                    styles.saveBtn,
                    { backgroundColor: colors.primary, width: '100%', marginTop: 24 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'sw' ? 'Kamilisha usajili' : 'Finish registration'
                  }
                >
                  <Text style={styles.saveBtnText}>
                    {language === 'sw' ? 'Kamilisha' : 'Finish'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
    </Gate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  protoBanner: {
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  protoBannerText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 10,
    paddingBottom: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 24,
    marginLeft: 4,
  },
  glassCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 17,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  statValue: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 16,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  droneActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  actionBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 8,
  },
  actionBtnTextSecondary: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  irrigationStats: {
    gap: 16,
  },
  iStat: {
    gap: 8,
  },
  iStatLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  iStatValue: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  deviceHubBanner: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  deviceHubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  deviceHubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  deviceHubTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  registerFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2E6F40',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  registerFabText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: '#fff',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deviceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  deviceType: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
    letterSpacing: 0.6,
  },
  telemetryMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  telemetryMiniBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  telemetryMiniTxt: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  deviceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  deviceStatusText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  deviceHubFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deviceHubFooterText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  sensorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sensorCard: {
    width: '48%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sensorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sensorValue: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
    marginBottom: 4,
  },
  sensorLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  subTitleText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  subBodyText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  subTierRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  subTierBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
  },
  subTierName: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  subTierPrice: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    marginTop: 6,
  },
  subTierPeriod: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },

  // Modals styling
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerWrapper: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  cameraBox: {
    width: 200,
    height: 200,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 2,
    borderColor: 'rgba(46, 111, 64,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  scannerLaser: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    borderTopWidth: 2,
  },
  scannerDescText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    position: 'absolute',
    bottom: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  manualBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  manualBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },
  typeOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOptionBox: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeOptionText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  linkAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(46, 111, 64,0.06)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.15)',
  },
  linkAlertText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  successWrapper: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  successTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    marginTop: 12,
  },
  successDesc: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Waypoints specific styles
  waypointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  waypointText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  waypointInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  addWaypointBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  detailTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  detailTabButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  specItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  specName: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  specProduct: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  specDesc: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    lineHeight: 16,
  },
  specCost: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
  buyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  toolsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
    gap: 8,
  },
  toolsTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  toolBullet: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  assumptionsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
    gap: 8,
  },
  assumptionsTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  assumptionBullet: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  guideSectionCard: {
    gap: 12,
  },
  guideSectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  stepItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  stepItemNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepItemTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  stepItemText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
});
