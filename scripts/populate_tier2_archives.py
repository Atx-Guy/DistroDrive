#!/usr/bin/env python3
"""
Historical Archive Population Script for Tier 2 Distributions
Populates historical releases for distributions that still only have 1 release.
"""

import os
import sys
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Error: psycopg2 not installed")
    sys.exit(1)

TIER2_RELEASES = {
    'Pop!_OS': [
        {'version': '22.04', 'date': '2022-04-25', 'lts': True, 'url': 'https://iso.pop-os.org/22.04/amd64/intel/40/pop-os_22.04_amd64_intel_40.iso'},
        {'version': '21.10', 'date': '2021-12-14', 'lts': False, 'url': 'https://pop-iso.sfo2.cdn.digitaloceanspaces.com/21.10/amd64/intel/8/pop-os_21.10_amd64_intel_8.iso'},
        {'version': '21.04', 'date': '2021-06-29', 'lts': False, 'url': 'https://pop-iso.sfo2.cdn.digitaloceanspaces.com/21.04/amd64/intel/6/pop-os_21.04_amd64_intel_6.iso'},
        {'version': '20.10', 'date': '2020-10-23', 'lts': False, 'url': 'https://pop-iso.sfo2.cdn.digitaloceanspaces.com/20.10/amd64/intel/5/pop-os_20.10_amd64_intel_5.iso'},
        {'version': '20.04', 'date': '2020-05-01', 'lts': True, 'url': 'https://pop-iso.sfo2.cdn.digitaloceanspaces.com/20.04/amd64/intel/38/pop-os_20.04_amd64_intel_38.iso'},
        {'version': '19.10', 'date': '2019-10-22', 'lts': False, 'url': 'https://pop-iso.sfo2.cdn.digitaloceanspaces.com/19.10/amd64/intel/12/pop-os_19.10_amd64_intel_12.iso'},
        {'version': '19.04', 'date': '2019-04-30', 'lts': False, 'url': 'https://pop-iso.sfo2.cdn.digitaloceanspaces.com/19.04/amd64/intel/21/pop-os_19.04_amd64_intel_21.iso'},
        {'version': '18.10', 'date': '2018-10-20', 'lts': False, 'url': 'https://pop-iso.sfo2.cdn.digitaloceanspaces.com/18.10/amd64/intel/15/pop-os_18.10_amd64_intel_15.iso'},
        {'version': '18.04', 'date': '2018-04-26', 'lts': True, 'url': 'https://pop-iso.sfo2.cdn.digitaloceanspaces.com/18.04/amd64/intel/39/pop-os_18.04_amd64_intel_39.iso'},
    ],
    'Elementary OS': [
        {'version': '7.1', 'date': '2023-10-03', 'lts': False, 'url': 'https://ams3.dl.elementary.io/download/0l4rERK3TZxp1sI0Ln5BzA==/elementaryos-7.1-stable.20230926rc.iso'},
        {'version': '7.0', 'date': '2023-01-31', 'lts': False, 'url': 'https://ams3.dl.elementary.io/download/0l4rERK3TZxp1sI0Ln5BzA==/elementaryos-7.0-stable.20230129.iso'},
        {'version': '6.1', 'date': '2021-12-21', 'lts': False, 'url': 'https://ams3.dl.elementary.io/download/0l4rERK3TZxp1sI0Ln5BzA==/elementaryos-6.1-stable.20211218-rc.iso'},
        {'version': '6.0', 'date': '2021-08-10', 'lts': False, 'url': 'https://ams3.dl.elementary.io/download/0l4rERK3TZxp1sI0Ln5BzA==/elementaryos-6.0-stable.20210810.iso'},
        {'version': '5.1.7', 'date': '2020-09-02', 'lts': False, 'url': 'https://ams3.dl.elementary.io/download/0l4rERK3TZxp1sI0Ln5BzA==/elementaryos-5.1.7-stable.20200903.iso'},
        {'version': '5.1', 'date': '2019-12-03', 'lts': False, 'url': 'https://ams3.dl.elementary.io/download/0l4rERK3TZxp1sI0Ln5BzA==/elementaryos-5.1-stable.20191202.iso'},
        {'version': '5.0', 'date': '2018-10-16', 'lts': False, 'url': 'https://ams3.dl.elementary.io/download/0l4rERK3TZxp1sI0Ln5BzA==/elementaryos-5.0-stable.20181016.iso'},
    ],
    'Zorin OS': [
        {'version': '17.2', 'date': '2024-09-12', 'lts': False, 'url': 'https://zorinos.com/download/17/core/64/'},
        {'version': '17.1', 'date': '2024-03-14', 'lts': False, 'url': 'https://zorinos.com/download/17/core/64/'},
        {'version': '17', 'date': '2023-12-20', 'lts': False, 'url': 'https://zorinos.com/download/17/core/64/'},
        {'version': '16.3', 'date': '2023-05-04', 'lts': True, 'url': 'https://zorinos.com/download/16/core/64/'},
        {'version': '16.2', 'date': '2022-09-13', 'lts': True, 'url': 'https://zorinos.com/download/16/core/64/'},
        {'version': '16.1', 'date': '2022-03-10', 'lts': True, 'url': 'https://zorinos.com/download/16/core/64/'},
        {'version': '16', 'date': '2021-08-17', 'lts': True, 'url': 'https://zorinos.com/download/16/core/64/'},
        {'version': '15.3', 'date': '2020-09-08', 'lts': True, 'url': 'https://zorinos.com/download/15/core/64/'},
        {'version': '15.2', 'date': '2020-03-05', 'lts': True, 'url': 'https://zorinos.com/download/15/core/64/'},
        {'version': '15.1', 'date': '2019-11-14', 'lts': True, 'url': 'https://zorinos.com/download/15/core/64/'},
        {'version': '15', 'date': '2019-06-05', 'lts': True, 'url': 'https://zorinos.com/download/15/core/64/'},
    ],
    'Kali Linux': [
        {'version': '2024.4', 'date': '2024-12-09', 'lts': False, 'url': 'https://cdimage.kali.org/kali-2024.4/kali-linux-2024.4-installer-amd64.iso'},
        {'version': '2024.3', 'date': '2024-09-11', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2024.3/kali-linux-2024.3-installer-amd64.iso'},
        {'version': '2024.2', 'date': '2024-06-05', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2024.2/kali-linux-2024.2-installer-amd64.iso'},
        {'version': '2024.1', 'date': '2024-02-27', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2024.1/kali-linux-2024.1-installer-amd64.iso'},
        {'version': '2023.4', 'date': '2023-12-05', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2023.4/kali-linux-2023.4-installer-amd64.iso'},
        {'version': '2023.3', 'date': '2023-08-23', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2023.3/kali-linux-2023.3-installer-amd64.iso'},
        {'version': '2023.2', 'date': '2023-05-30', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2023.2/kali-linux-2023.2-installer-amd64.iso'},
        {'version': '2023.1', 'date': '2023-03-13', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2023.1/kali-linux-2023.1-installer-amd64.iso'},
        {'version': '2022.4', 'date': '2022-12-06', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2022.4/kali-linux-2022.4-installer-amd64.iso'},
        {'version': '2022.3', 'date': '2022-08-09', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2022.3/kali-linux-2022.3-installer-amd64.iso'},
        {'version': '2022.2', 'date': '2022-06-06', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2022.2/kali-linux-2022.2-installer-amd64.iso'},
        {'version': '2022.1', 'date': '2022-02-14', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2022.1/kali-linux-2022.1-installer-amd64.iso'},
        {'version': '2021.4', 'date': '2021-12-09', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2021.4/kali-linux-2021.4-installer-amd64.iso'},
        {'version': '2021.3', 'date': '2021-09-14', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2021.3/kali-linux-2021.3-installer-amd64.iso'},
        {'version': '2021.2', 'date': '2021-06-01', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2021.2/kali-linux-2021.2-installer-amd64.iso'},
        {'version': '2021.1', 'date': '2021-02-24', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2021.1/kali-linux-2021.1-installer-amd64.iso'},
        {'version': '2020.4', 'date': '2020-11-18', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2020.4/kali-linux-2020.4-installer-amd64.iso'},
        {'version': '2020.3', 'date': '2020-08-12', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2020.3/kali-linux-2020.3-installer-amd64.iso'},
        {'version': '2020.2', 'date': '2020-05-12', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2020.2/kali-linux-2020.2-installer-amd64.iso'},
        {'version': '2020.1', 'date': '2020-01-28', 'lts': False, 'url': 'https://old.kali.org/kali-images/kali-2020.1/kali-linux-2020.1-installer-amd64.iso'},
    ],
    'MX Linux': [
        {'version': '23.4', 'date': '2024-10-01', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-23.4_x64.iso'},
        {'version': '23.3', 'date': '2024-06-01', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-23.3_x64.iso'},
        {'version': '23.2', 'date': '2024-03-01', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-23.2_x64.iso'},
        {'version': '23.1', 'date': '2023-10-15', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-23.1_x64.iso'},
        {'version': '23', 'date': '2023-07-30', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-23_x64.iso'},
        {'version': '21.3', 'date': '2022-12-01', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-21.3_x64.iso'},
        {'version': '21.2.1', 'date': '2022-08-26', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-21.2.1_x64.iso'},
        {'version': '21.2', 'date': '2022-07-15', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-21.2_x64.iso'},
        {'version': '21.1', 'date': '2022-03-12', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-21.1_x64.iso'},
        {'version': '21', 'date': '2021-10-21', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-21_x64.iso'},
        {'version': '19.4', 'date': '2021-04-01', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-19.4_x64.iso'},
        {'version': '19.3', 'date': '2020-10-14', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-19.3_x64.iso'},
        {'version': '19.2', 'date': '2020-06-01', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-19.2_x64.iso'},
        {'version': '19.1', 'date': '2020-02-15', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-19.1_x64.iso'},
        {'version': '19', 'date': '2019-10-21', 'lts': False, 'url': 'https://sourceforge.net/projects/mx-linux/files/Final/Xfce/MX-19_x64.iso'},
    ],
    'openSUSE Leap': [
        {'version': '15.6', 'date': '2024-06-12', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/15.6/iso/openSUSE-Leap-15.6-DVD-x86_64-Current.iso'},
        {'version': '15.5', 'date': '2023-06-07', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/15.5/iso/openSUSE-Leap-15.5-DVD-x86_64-Current.iso'},
        {'version': '15.4', 'date': '2022-06-08', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/15.4/iso/openSUSE-Leap-15.4-DVD-x86_64-Current.iso'},
        {'version': '15.3', 'date': '2021-06-02', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/15.3/iso/openSUSE-Leap-15.3-DVD-x86_64-Current.iso'},
        {'version': '15.2', 'date': '2020-07-02', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/15.2/iso/openSUSE-Leap-15.2-DVD-x86_64-Current.iso'},
        {'version': '15.1', 'date': '2019-05-22', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/15.1/iso/openSUSE-Leap-15.1-DVD-x86_64-Current.iso'},
        {'version': '15.0', 'date': '2018-05-25', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/15.0/iso/openSUSE-Leap-15.0-DVD-x86_64-Current.iso'},
        {'version': '42.3', 'date': '2017-07-26', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/42.3/iso/openSUSE-Leap-42.3-DVD-x86_64.iso'},
        {'version': '42.2', 'date': '2016-11-16', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/42.2/iso/openSUSE-Leap-42.2-DVD-x86_64.iso'},
        {'version': '42.1', 'date': '2015-11-04', 'lts': True, 'url': 'https://download.opensuse.org/distribution/leap/42.1/iso/openSUSE-Leap-42.1-DVD-x86_64.iso'},
    ],
    'Rocky Linux': [
        {'version': '9.5', 'date': '2024-11-18', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.5-x86_64-dvd.iso'},
        {'version': '9.4', 'date': '2024-05-09', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.4-x86_64-dvd.iso'},
        {'version': '9.3', 'date': '2023-11-20', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.3-x86_64-dvd.iso'},
        {'version': '9.2', 'date': '2023-05-16', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.2-x86_64-dvd.iso'},
        {'version': '9.1', 'date': '2022-11-21', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.1-x86_64-dvd.iso'},
        {'version': '9.0', 'date': '2022-07-14', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.0-x86_64-dvd.iso'},
        {'version': '8.10', 'date': '2024-05-28', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/8/isos/x86_64/Rocky-8.10-x86_64-dvd1.iso'},
        {'version': '8.9', 'date': '2023-11-21', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/8/isos/x86_64/Rocky-8.9-x86_64-dvd1.iso'},
        {'version': '8.8', 'date': '2023-05-19', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/8/isos/x86_64/Rocky-8.8-x86_64-dvd1.iso'},
        {'version': '8.7', 'date': '2022-11-14', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/8/isos/x86_64/Rocky-8.7-x86_64-dvd1.iso'},
        {'version': '8.6', 'date': '2022-05-16', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/8/isos/x86_64/Rocky-8.6-x86_64-dvd1.iso'},
        {'version': '8.5', 'date': '2021-11-15', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/8/isos/x86_64/Rocky-8.5-x86_64-dvd1.iso'},
        {'version': '8.4', 'date': '2021-06-21', 'lts': True, 'url': 'https://download.rockylinux.org/pub/rocky/8/isos/x86_64/Rocky-8.4-x86_64-dvd1.iso'},
    ],
    'AlmaLinux': [
        {'version': '9.5', 'date': '2024-11-18', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/9.5/isos/x86_64/AlmaLinux-9.5-x86_64-dvd.iso'},
        {'version': '9.4', 'date': '2024-05-06', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/9.4/isos/x86_64/AlmaLinux-9.4-x86_64-dvd.iso'},
        {'version': '9.3', 'date': '2023-11-13', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/9.3/isos/x86_64/AlmaLinux-9.3-x86_64-dvd.iso'},
        {'version': '9.2', 'date': '2023-05-10', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/9.2/isos/x86_64/AlmaLinux-9.2-x86_64-dvd.iso'},
        {'version': '9.1', 'date': '2022-11-17', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/9.1/isos/x86_64/AlmaLinux-9.1-x86_64-dvd.iso'},
        {'version': '9.0', 'date': '2022-05-26', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/9.0/isos/x86_64/AlmaLinux-9.0-x86_64-dvd.iso'},
        {'version': '8.10', 'date': '2024-05-28', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/8.10/isos/x86_64/AlmaLinux-8.10-x86_64-dvd.iso'},
        {'version': '8.9', 'date': '2023-11-21', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/8.9/isos/x86_64/AlmaLinux-8.9-x86_64-dvd.iso'},
        {'version': '8.8', 'date': '2023-05-18', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/8.8/isos/x86_64/AlmaLinux-8.8-x86_64-dvd.iso'},
        {'version': '8.7', 'date': '2022-11-10', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/8.7/isos/x86_64/AlmaLinux-8.7-x86_64-dvd.iso'},
        {'version': '8.6', 'date': '2022-05-12', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/8.6/isos/x86_64/AlmaLinux-8.6-x86_64-dvd.iso'},
        {'version': '8.5', 'date': '2021-11-12', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/8.5/isos/x86_64/AlmaLinux-8.5-x86_64-dvd.iso'},
        {'version': '8.4', 'date': '2021-05-26', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/8.4/isos/x86_64/AlmaLinux-8.4-x86_64-dvd.iso'},
        {'version': '8.3', 'date': '2021-03-30', 'lts': True, 'url': 'https://repo.almalinux.org/almalinux/8.3/isos/x86_64/AlmaLinux-8.3-x86_64-dvd.iso'},
    ],
    'NixOS': [
        {'version': '24.11', 'date': '2024-11-30', 'lts': False, 'url': 'https://channels.nixos.org/nixos-24.11/latest-nixos-gnome-x86_64-linux.iso'},
        {'version': '24.05', 'date': '2024-05-31', 'lts': False, 'url': 'https://channels.nixos.org/nixos-24.05/latest-nixos-gnome-x86_64-linux.iso'},
        {'version': '23.11', 'date': '2023-11-29', 'lts': False, 'url': 'https://channels.nixos.org/nixos-23.11/latest-nixos-gnome-x86_64-linux.iso'},
        {'version': '23.05', 'date': '2023-05-31', 'lts': False, 'url': 'https://channels.nixos.org/nixos-23.05/latest-nixos-gnome-x86_64-linux.iso'},
        {'version': '22.11', 'date': '2022-11-30', 'lts': False, 'url': 'https://channels.nixos.org/nixos-22.11/latest-nixos-gnome-x86_64-linux.iso'},
        {'version': '22.05', 'date': '2022-05-30', 'lts': False, 'url': 'https://channels.nixos.org/nixos-22.05/latest-nixos-gnome-x86_64-linux.iso'},
        {'version': '21.11', 'date': '2021-11-30', 'lts': False, 'url': 'https://channels.nixos.org/nixos-21.11/latest-nixos-gnome-x86_64-linux.iso'},
        {'version': '21.05', 'date': '2021-05-31', 'lts': False, 'url': 'https://channels.nixos.org/nixos-21.05/latest-nixos-gnome-x86_64-linux.iso'},
        {'version': '20.09', 'date': '2020-10-27', 'lts': False, 'url': 'https://channels.nixos.org/nixos-20.09/latest-nixos-gnome-x86_64-linux.iso'},
        {'version': '20.03', 'date': '2020-04-20', 'lts': False, 'url': 'https://channels.nixos.org/nixos-20.03/latest-nixos-gnome-x86_64-linux.iso'},
    ],
    'Gentoo': [
        {'version': '20241208', 'date': '2024-12-08', 'lts': False, 'url': 'https://distfiles.gentoo.org/releases/amd64/autobuilds/current-install-amd64-minimal/install-amd64-minimal-20241208T164822Z.iso'},
        {'version': '20241201', 'date': '2024-12-01', 'lts': False, 'url': 'https://distfiles.gentoo.org/releases/amd64/autobuilds/20241201T164824Z/install-amd64-minimal-20241201T164824Z.iso'},
        {'version': '20241117', 'date': '2024-11-17', 'lts': False, 'url': 'https://distfiles.gentoo.org/releases/amd64/autobuilds/20241117T170324Z/install-amd64-minimal-20241117T170324Z.iso'},
        {'version': '20241103', 'date': '2024-11-03', 'lts': False, 'url': 'https://distfiles.gentoo.org/releases/amd64/autobuilds/20241103T170337Z/install-amd64-minimal-20241103T170337Z.iso'},
        {'version': '20241020', 'date': '2024-10-20', 'lts': False, 'url': 'https://distfiles.gentoo.org/releases/amd64/autobuilds/20241020T170322Z/install-amd64-minimal-20241020T170322Z.iso'},
        {'version': '20241006', 'date': '2024-10-06', 'lts': False, 'url': 'https://distfiles.gentoo.org/releases/amd64/autobuilds/20241006T170329Z/install-amd64-minimal-20241006T170329Z.iso'},
        {'version': '20240922', 'date': '2024-09-22', 'lts': False, 'url': 'https://distfiles.gentoo.org/releases/amd64/autobuilds/20240922T170328Z/install-amd64-minimal-20240922T170328Z.iso'},
        {'version': '20240908', 'date': '2024-09-08', 'lts': False, 'url': 'https://distfiles.gentoo.org/releases/amd64/autobuilds/20240908T170324Z/install-amd64-minimal-20240908T170324Z.iso'},
    ],
    'Tails': [
        {'version': '6.10', 'date': '2024-11-27', 'lts': False, 'url': 'https://tails.net/install/download/6.10/tails-amd64-6.10.iso'},
        {'version': '6.9', 'date': '2024-10-31', 'lts': False, 'url': 'https://tails.net/install/download/6.9/tails-amd64-6.9.iso'},
        {'version': '6.8.1', 'date': '2024-10-15', 'lts': False, 'url': 'https://tails.net/install/download/6.8.1/tails-amd64-6.8.1.iso'},
        {'version': '6.7', 'date': '2024-09-11', 'lts': False, 'url': 'https://tails.net/install/download/6.7/tails-amd64-6.7.iso'},
        {'version': '6.6', 'date': '2024-08-14', 'lts': False, 'url': 'https://tails.net/install/download/6.6/tails-amd64-6.6.iso'},
        {'version': '6.5', 'date': '2024-07-30', 'lts': False, 'url': 'https://tails.net/install/download/6.5/tails-amd64-6.5.iso'},
        {'version': '6.4', 'date': '2024-06-18', 'lts': False, 'url': 'https://tails.net/install/download/6.4/tails-amd64-6.4.iso'},
        {'version': '6.3', 'date': '2024-05-28', 'lts': False, 'url': 'https://tails.net/install/download/6.3/tails-amd64-6.3.iso'},
        {'version': '6.2', 'date': '2024-05-07', 'lts': False, 'url': 'https://tails.net/install/download/6.2/tails-amd64-6.2.iso'},
        {'version': '6.1', 'date': '2024-04-09', 'lts': False, 'url': 'https://tails.net/install/download/6.1/tails-amd64-6.1.iso'},
        {'version': '6.0', 'date': '2024-02-27', 'lts': False, 'url': 'https://tails.net/install/download/6.0/tails-amd64-6.0.iso'},
        {'version': '5.22', 'date': '2024-02-06', 'lts': False, 'url': 'https://tails.net/install/download/5.22/tails-amd64-5.22.iso'},
        {'version': '5.21', 'date': '2023-12-19', 'lts': False, 'url': 'https://tails.net/install/download/5.21/tails-amd64-5.21.iso'},
        {'version': '5.20', 'date': '2023-11-28', 'lts': False, 'url': 'https://tails.net/install/download/5.20/tails-amd64-5.20.iso'},
    ],
    'Qubes OS': [
        {'version': '4.2.3', 'date': '2024-09-26', 'lts': False, 'url': 'https://ftp.qubes-os.org/iso/Qubes-R4.2.3-x86_64.iso'},
        {'version': '4.2.2', 'date': '2024-07-12', 'lts': False, 'url': 'https://ftp.qubes-os.org/iso/Qubes-R4.2.2-x86_64.iso'},
        {'version': '4.2.1', 'date': '2024-04-02', 'lts': False, 'url': 'https://ftp.qubes-os.org/iso/Qubes-R4.2.1-x86_64.iso'},
        {'version': '4.2.0', 'date': '2023-12-18', 'lts': False, 'url': 'https://ftp.qubes-os.org/iso/Qubes-R4.2.0-x86_64.iso'},
        {'version': '4.1.2', 'date': '2023-03-15', 'lts': False, 'url': 'https://ftp.qubes-os.org/iso/Qubes-R4.1.2-x86_64.iso'},
        {'version': '4.1.1', 'date': '2022-06-14', 'lts': False, 'url': 'https://ftp.qubes-os.org/iso/Qubes-R4.1.1-x86_64.iso'},
        {'version': '4.1.0', 'date': '2022-02-04', 'lts': False, 'url': 'https://ftp.qubes-os.org/iso/Qubes-R4.1-x86_64.iso'},
        {'version': '4.0.4', 'date': '2021-03-04', 'lts': False, 'url': 'https://ftp.qubes-os.org/iso/Qubes-R4.0.4-x86_64.iso'},
        {'version': '4.0.3', 'date': '2019-11-26', 'lts': False, 'url': 'https://ftp.qubes-os.org/iso/Qubes-R4.0.3-x86_64.iso'},
    ],
    'Solus': [
        {'version': '4.6', 'date': '2024-10-17', 'lts': False, 'url': 'https://mirrors.rit.edu/solus/images/4.6/Solus-4.6-Budgie.iso'},
        {'version': '4.5', 'date': '2024-01-08', 'lts': False, 'url': 'https://mirrors.rit.edu/solus/images/4.5/Solus-4.5-Budgie.iso'},
        {'version': '4.4', 'date': '2023-07-08', 'lts': False, 'url': 'https://mirrors.rit.edu/solus/images/4.4/Solus-4.4-Budgie.iso'},
        {'version': '4.3', 'date': '2022-07-08', 'lts': False, 'url': 'https://mirrors.rit.edu/solus/images/4.3/Solus-4.3-Budgie.iso'},
        {'version': '4.2', 'date': '2021-04-09', 'lts': False, 'url': 'https://mirrors.rit.edu/solus/images/4.2/Solus-4.2-Budgie.iso'},
        {'version': '4.1', 'date': '2020-01-25', 'lts': False, 'url': 'https://mirrors.rit.edu/solus/images/4.1/Solus-4.1-Budgie.iso'},
        {'version': '4.0', 'date': '2019-03-17', 'lts': False, 'url': 'https://mirrors.rit.edu/solus/images/4.0/Solus-4.0-Budgie.iso'},
        {'version': '3.9999', 'date': '2018-08-15', 'lts': False, 'url': 'https://mirrors.rit.edu/solus/images/3.9999/Solus-3.9999-Budgie.iso'},
    ],
    'EndeavourOS': [
        {'version': 'Endeavour', 'date': '2024-11-26', 'lts': False, 'url': 'https://mirrors.gigenet.com/endeavouros/iso/EndeavourOS_Endeavour-2024.11.26.iso'},
        {'version': 'Gemini', 'date': '2024-04-20', 'lts': False, 'url': 'https://mirrors.gigenet.com/endeavouros/iso/EndeavourOS_Gemini-2024.04.20.iso'},
        {'version': 'Galileo', 'date': '2023-12-17', 'lts': False, 'url': 'https://mirrors.gigenet.com/endeavouros/iso/EndeavourOS_Galileo-2023.12.17.iso'},
        {'version': 'Cassini Nova', 'date': '2023-05-27', 'lts': False, 'url': 'https://mirrors.gigenet.com/endeavouros/iso/EndeavourOS_Cassini_Nova-05-2023.iso'},
        {'version': 'Cassini', 'date': '2022-12-22', 'lts': False, 'url': 'https://mirrors.gigenet.com/endeavouros/iso/EndeavourOS_Cassini-2022.12.17.iso'},
        {'version': 'Artemis Neo', 'date': '2022-08-27', 'lts': False, 'url': 'https://mirrors.gigenet.com/endeavouros/iso/EndeavourOS_Artemis_neo-2022.08.28.iso'},
        {'version': 'Artemis', 'date': '2022-04-08', 'lts': False, 'url': 'https://mirrors.gigenet.com/endeavouros/iso/EndeavourOS_Artemis-2022.04.08.iso'},
        {'version': 'Apollo', 'date': '2021-08-27', 'lts': False, 'url': 'https://mirrors.gigenet.com/endeavouros/iso/EndeavourOS_Apollo_2021.08.27.iso'},
        {'version': 'Atlantis Neo', 'date': '2021-12-20', 'lts': False, 'url': 'https://mirrors.gigenet.com/endeavouros/iso/EndeavourOS_Atlantis_neo-2021.12.17.iso'},
    ],
    'Garuda Linux': [
        {'version': '241118', 'date': '2024-11-18', 'lts': False, 'url': 'https://iso.builds.garudalinux.org/iso/latest/garuda/dr460nized/'},
        {'version': '240831', 'date': '2024-08-31', 'lts': False, 'url': 'https://iso.builds.garudalinux.org/iso/240831/garuda/dr460nized/'},
        {'version': '240428', 'date': '2024-04-28', 'lts': False, 'url': 'https://iso.builds.garudalinux.org/iso/240428/garuda/dr460nized/'},
        {'version': '231029', 'date': '2023-10-29', 'lts': False, 'url': 'https://iso.builds.garudalinux.org/iso/231029/garuda/dr460nized/'},
        {'version': '230801', 'date': '2023-08-01', 'lts': False, 'url': 'https://iso.builds.garudalinux.org/iso/230801/garuda/dr460nized/'},
        {'version': '230501', 'date': '2023-05-01', 'lts': False, 'url': 'https://iso.builds.garudalinux.org/iso/230501/garuda/dr460nized/'},
        {'version': '221215', 'date': '2022-12-15', 'lts': False, 'url': 'https://iso.builds.garudalinux.org/iso/221215/garuda/dr460nized/'},
    ],
    'Void Linux': [
        {'version': '20240314', 'date': '2024-03-14', 'lts': False, 'url': 'https://repo-default.voidlinux.org/live/current/void-live-x86_64-20240314-xfce.iso'},
        {'version': '20230628', 'date': '2023-06-28', 'lts': False, 'url': 'https://repo-default.voidlinux.org/live/20230628/void-live-x86_64-20230628-xfce.iso'},
        {'version': '20221001', 'date': '2022-10-01', 'lts': False, 'url': 'https://repo-default.voidlinux.org/live/20221001/void-live-x86_64-20221001-xfce.iso'},
        {'version': '20210930', 'date': '2021-09-30', 'lts': False, 'url': 'https://repo-default.voidlinux.org/live/20210930/void-live-x86_64-20210930-xfce.iso'},
        {'version': '20210218', 'date': '2021-02-18', 'lts': False, 'url': 'https://repo-default.voidlinux.org/live/20210218/void-live-x86_64-20210218-xfce.iso'},
        {'version': '20191109', 'date': '2019-11-09', 'lts': False, 'url': 'https://repo-default.voidlinux.org/live/20191109/void-live-x86_64-20191109-xfce.iso'},
    ],
    'Slackware': [
        {'version': '15.0', 'date': '2022-02-02', 'lts': True, 'url': 'https://mirrors.slackware.com/slackware/slackware-iso/slackware64-15.0-iso/slackware64-15.0-install-dvd.iso'},
        {'version': '14.2', 'date': '2016-06-30', 'lts': True, 'url': 'https://mirrors.slackware.com/slackware/slackware-iso/slackware64-14.2-iso/slackware64-14.2-install-dvd.iso'},
        {'version': '14.1', 'date': '2013-11-04', 'lts': True, 'url': 'https://mirrors.slackware.com/slackware/slackware-iso/slackware64-14.1-iso/slackware64-14.1-install-dvd.iso'},
        {'version': '14.0', 'date': '2012-09-28', 'lts': True, 'url': 'https://mirrors.slackware.com/slackware/slackware-iso/slackware64-14.0-iso/slackware64-14.0-install-dvd.iso'},
        {'version': '13.37', 'date': '2011-04-27', 'lts': True, 'url': 'https://mirrors.slackware.com/slackware/slackware-iso/slackware64-13.37-iso/slackware64-13.37-install-dvd.iso'},
    ],
    'Deepin': [
        {'version': '23', 'date': '2024-04-18', 'lts': False, 'url': 'https://cdimage.deepin.com/releases/23/deepin-desktop-community-23-amd64.iso'},
        {'version': '20.9', 'date': '2023-04-26', 'lts': False, 'url': 'https://cdimage.deepin.com/releases/20.9/deepin-desktop-community-20.9-amd64.iso'},
        {'version': '20.8', 'date': '2023-01-05', 'lts': False, 'url': 'https://cdimage.deepin.com/releases/20.8/deepin-desktop-community-20.8-amd64.iso'},
        {'version': '20.7.1', 'date': '2022-09-23', 'lts': False, 'url': 'https://cdimage.deepin.com/releases/20.7.1/deepin-desktop-community-20.7.1-amd64.iso'},
        {'version': '20.6', 'date': '2022-06-29', 'lts': False, 'url': 'https://cdimage.deepin.com/releases/20.6/deepin-desktop-community-20.6-amd64.iso'},
        {'version': '20.5', 'date': '2022-03-31', 'lts': False, 'url': 'https://cdimage.deepin.com/releases/20.5/deepin-desktop-community-20.5-amd64.iso'},
        {'version': '20.4', 'date': '2022-01-14', 'lts': False, 'url': 'https://cdimage.deepin.com/releases/20.4/deepin-desktop-community-20.4-amd64.iso'},
        {'version': '20.3', 'date': '2021-11-25', 'lts': False, 'url': 'https://cdimage.deepin.com/releases/20.3/deepin-desktop-community-20.3-amd64.iso'},
        {'version': '20.2.4', 'date': '2021-09-15', 'lts': False, 'url': 'https://cdimage.deepin.com/releases/20.2.4/deepin-desktop-community-20.2.4-amd64.iso'},
    ],
    'Kubuntu': [
        {'version': '24.10', 'date': '2024-10-10', 'lts': False, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/24.10/release/kubuntu-24.10-desktop-amd64.iso'},
        {'version': '24.04.1', 'date': '2024-08-22', 'lts': True, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/24.04.1/release/kubuntu-24.04.1-desktop-amd64.iso'},
        {'version': '24.04', 'date': '2024-04-25', 'lts': True, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/24.04/release/kubuntu-24.04-desktop-amd64.iso'},
        {'version': '23.10', 'date': '2023-10-12', 'lts': False, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/23.10/release/kubuntu-23.10-desktop-amd64.iso'},
        {'version': '23.04', 'date': '2023-04-20', 'lts': False, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/23.04/release/kubuntu-23.04-desktop-amd64.iso'},
        {'version': '22.04.3', 'date': '2023-08-10', 'lts': True, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/22.04.3/release/kubuntu-22.04.3-desktop-amd64.iso'},
        {'version': '22.04.2', 'date': '2023-02-23', 'lts': True, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/22.04.2/release/kubuntu-22.04.2-desktop-amd64.iso'},
        {'version': '22.04.1', 'date': '2022-08-12', 'lts': True, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/22.04.1/release/kubuntu-22.04.1-desktop-amd64.iso'},
        {'version': '22.04', 'date': '2022-04-21', 'lts': True, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/22.04/release/kubuntu-22.04-desktop-amd64.iso'},
        {'version': '20.04.6', 'date': '2023-03-23', 'lts': True, 'url': 'https://cdimage.ubuntu.com/kubuntu/releases/20.04.6/release/kubuntu-20.04.6-desktop-amd64.iso'},
    ],
    'Xubuntu': [
        {'version': '24.10', 'date': '2024-10-10', 'lts': False, 'url': 'https://cdimage.ubuntu.com/xubuntu/releases/24.10/release/xubuntu-24.10-desktop-amd64.iso'},
        {'version': '24.04.1', 'date': '2024-08-22', 'lts': True, 'url': 'https://cdimage.ubuntu.com/xubuntu/releases/24.04.1/release/xubuntu-24.04.1-desktop-amd64.iso'},
        {'version': '24.04', 'date': '2024-04-25', 'lts': True, 'url': 'https://cdimage.ubuntu.com/xubuntu/releases/24.04/release/xubuntu-24.04-desktop-amd64.iso'},
        {'version': '23.10', 'date': '2023-10-12', 'lts': False, 'url': 'https://cdimage.ubuntu.com/xubuntu/releases/23.10/release/xubuntu-23.10-desktop-amd64.iso'},
        {'version': '23.04', 'date': '2023-04-20', 'lts': False, 'url': 'https://cdimage.ubuntu.com/xubuntu/releases/23.04/release/xubuntu-23.04-desktop-amd64.iso'},
        {'version': '22.04.3', 'date': '2023-08-10', 'lts': True, 'url': 'https://cdimage.ubuntu.com/xubuntu/releases/22.04.3/release/xubuntu-22.04.3-desktop-amd64.iso'},
        {'version': '22.04', 'date': '2022-04-21', 'lts': True, 'url': 'https://cdimage.ubuntu.com/xubuntu/releases/22.04/release/xubuntu-22.04-desktop-amd64.iso'},
        {'version': '20.04.6', 'date': '2023-03-23', 'lts': True, 'url': 'https://cdimage.ubuntu.com/xubuntu/releases/20.04.6/release/xubuntu-20.04.6-desktop-amd64.iso'},
    ],
    'Lubuntu': [
        {'version': '24.10', 'date': '2024-10-10', 'lts': False, 'url': 'https://cdimage.ubuntu.com/lubuntu/releases/24.10/release/lubuntu-24.10-desktop-amd64.iso'},
        {'version': '24.04.1', 'date': '2024-08-22', 'lts': True, 'url': 'https://cdimage.ubuntu.com/lubuntu/releases/24.04.1/release/lubuntu-24.04.1-desktop-amd64.iso'},
        {'version': '24.04', 'date': '2024-04-25', 'lts': True, 'url': 'https://cdimage.ubuntu.com/lubuntu/releases/24.04/release/lubuntu-24.04-desktop-amd64.iso'},
        {'version': '23.10', 'date': '2023-10-12', 'lts': False, 'url': 'https://cdimage.ubuntu.com/lubuntu/releases/23.10/release/lubuntu-23.10-desktop-amd64.iso'},
        {'version': '23.04', 'date': '2023-04-20', 'lts': False, 'url': 'https://cdimage.ubuntu.com/lubuntu/releases/23.04/release/lubuntu-23.04-desktop-amd64.iso'},
        {'version': '22.04.3', 'date': '2023-08-10', 'lts': True, 'url': 'https://cdimage.ubuntu.com/lubuntu/releases/22.04.3/release/lubuntu-22.04.3-desktop-amd64.iso'},
        {'version': '22.04', 'date': '2022-04-21', 'lts': True, 'url': 'https://cdimage.ubuntu.com/lubuntu/releases/22.04/release/lubuntu-22.04-desktop-amd64.iso'},
        {'version': '20.04.6', 'date': '2023-03-23', 'lts': True, 'url': 'https://cdimage.ubuntu.com/lubuntu/releases/20.04.6/release/lubuntu-20.04.6-desktop-amd64.iso'},
    ],
    'Ubuntu MATE': [
        {'version': '24.10', 'date': '2024-10-10', 'lts': False, 'url': 'https://cdimage.ubuntu.com/ubuntu-mate/releases/24.10/release/ubuntu-mate-24.10-desktop-amd64.iso'},
        {'version': '24.04.1', 'date': '2024-08-22', 'lts': True, 'url': 'https://cdimage.ubuntu.com/ubuntu-mate/releases/24.04.1/release/ubuntu-mate-24.04.1-desktop-amd64.iso'},
        {'version': '24.04', 'date': '2024-04-25', 'lts': True, 'url': 'https://cdimage.ubuntu.com/ubuntu-mate/releases/24.04/release/ubuntu-mate-24.04-desktop-amd64.iso'},
        {'version': '23.10', 'date': '2023-10-12', 'lts': False, 'url': 'https://cdimage.ubuntu.com/ubuntu-mate/releases/23.10/release/ubuntu-mate-23.10-desktop-amd64.iso'},
        {'version': '23.04', 'date': '2023-04-20', 'lts': False, 'url': 'https://cdimage.ubuntu.com/ubuntu-mate/releases/23.04/release/ubuntu-mate-23.04-desktop-amd64.iso'},
        {'version': '22.04.3', 'date': '2023-08-10', 'lts': True, 'url': 'https://cdimage.ubuntu.com/ubuntu-mate/releases/22.04.3/release/ubuntu-mate-22.04.3-desktop-amd64.iso'},
        {'version': '22.04', 'date': '2022-04-21', 'lts': True, 'url': 'https://cdimage.ubuntu.com/ubuntu-mate/releases/22.04/release/ubuntu-mate-22.04-desktop-amd64.iso'},
        {'version': '20.04.6', 'date': '2023-03-23', 'lts': True, 'url': 'https://cdimage.ubuntu.com/ubuntu-mate/releases/20.04.6/release/ubuntu-mate-20.04.6-desktop-amd64.iso'},
    ],
    'KDE neon': [
        {'version': '20241212', 'date': '2024-12-12', 'lts': False, 'url': 'https://files.kde.org/neon/images/user/current/neon-user-current.iso'},
        {'version': '20241128', 'date': '2024-11-28', 'lts': False, 'url': 'https://files.kde.org/neon/images/user/20241128-1051/neon-user-20241128-1051.iso'},
        {'version': '20241114', 'date': '2024-11-14', 'lts': False, 'url': 'https://files.kde.org/neon/images/user/20241114-1016/neon-user-20241114-1016.iso'},
        {'version': '20241031', 'date': '2024-10-31', 'lts': False, 'url': 'https://files.kde.org/neon/images/user/20241031-1016/neon-user-20241031-1016.iso'},
        {'version': '20241017', 'date': '2024-10-17', 'lts': False, 'url': 'https://files.kde.org/neon/images/user/20241017-1013/neon-user-20241017-1013.iso'},
        {'version': '20241003', 'date': '2024-10-03', 'lts': False, 'url': 'https://files.kde.org/neon/images/user/20241003-1018/neon-user-20241003-1018.iso'},
    ],
    'Parrot OS': [
        {'version': '6.2', 'date': '2024-10-30', 'lts': False, 'url': 'https://deb.parrot.sh/parrot/iso/6.2/Parrot-security-6.2_amd64.iso'},
        {'version': '6.1', 'date': '2024-06-01', 'lts': False, 'url': 'https://deb.parrot.sh/parrot/iso/6.1/Parrot-security-6.1_amd64.iso'},
        {'version': '6.0', 'date': '2024-03-01', 'lts': False, 'url': 'https://deb.parrot.sh/parrot/iso/6.0/Parrot-security-6.0_amd64.iso'},
        {'version': '5.3', 'date': '2023-06-01', 'lts': False, 'url': 'https://deb.parrot.sh/parrot/iso/5.3/Parrot-security-5.3_amd64.iso'},
        {'version': '5.2', 'date': '2023-03-01', 'lts': False, 'url': 'https://deb.parrot.sh/parrot/iso/5.2/Parrot-security-5.2_amd64.iso'},
        {'version': '5.1', 'date': '2022-11-01', 'lts': False, 'url': 'https://deb.parrot.sh/parrot/iso/5.1/Parrot-security-5.1_amd64.iso'},
        {'version': '5.0', 'date': '2022-05-01', 'lts': False, 'url': 'https://deb.parrot.sh/parrot/iso/5.0/Parrot-security-5.0_amd64.iso'},
        {'version': '4.11', 'date': '2021-05-01', 'lts': False, 'url': 'https://deb.parrot.sh/parrot/iso/4.11/Parrot-security-4.11_amd64.iso'},
    ],
    'LMDE': [
        {'version': '6', 'date': '2024-03-20', 'lts': True, 'url': 'https://mirrors.kernel.org/linuxmint/debian/lmde-6-cinnamon-64bit.iso'},
        {'version': '5', 'date': '2022-03-20', 'lts': True, 'url': 'https://mirrors.kernel.org/linuxmint/debian/lmde-5-cinnamon-64bit.iso'},
        {'version': '4', 'date': '2020-03-20', 'lts': True, 'url': 'https://mirrors.kernel.org/linuxmint/debian/lmde-4-cinnamon-64bit.iso'},
        {'version': '3', 'date': '2018-08-31', 'lts': True, 'url': 'https://mirrors.kernel.org/linuxmint/debian/lmde-3-cinnamon-64bit.iso'},
    ],
    'Nobara': [
        {'version': '40', 'date': '2024-11-01', 'lts': False, 'url': 'https://nobara-images.nobaraproject.org/Nobara-40-Official-2024-11-01.iso'},
        {'version': '39', 'date': '2024-04-01', 'lts': False, 'url': 'https://nobara-images.nobaraproject.org/Nobara-39-Official-2024-04-01.iso'},
        {'version': '38', 'date': '2023-10-01', 'lts': False, 'url': 'https://nobara-images.nobaraproject.org/Nobara-38-Official-2023-10-01.iso'},
        {'version': '37', 'date': '2023-03-01', 'lts': False, 'url': 'https://nobara-images.nobaraproject.org/Nobara-37-Official-2023-03-01.iso'},
        {'version': '36', 'date': '2022-08-01', 'lts': False, 'url': 'https://nobara-images.nobaraproject.org/Nobara-36-Official-2022-08-01.iso'},
    ],
    'antiX': [
        {'version': '23.1', 'date': '2024-03-01', 'lts': False, 'url': 'https://sourceforge.net/projects/antix-linux/files/Final/antiX-23.1/antiX-23.1_x64-full.iso'},
        {'version': '23', 'date': '2023-08-15', 'lts': False, 'url': 'https://sourceforge.net/projects/antix-linux/files/Final/antiX-23/antiX-23_x64-full.iso'},
        {'version': '22', 'date': '2022-10-01', 'lts': False, 'url': 'https://sourceforge.net/projects/antix-linux/files/Final/antiX-22/antiX-22_x64-full.iso'},
        {'version': '21', 'date': '2021-10-15', 'lts': False, 'url': 'https://sourceforge.net/projects/antix-linux/files/Final/antiX-21/antiX-21_x64-full.iso'},
        {'version': '19.5', 'date': '2021-07-01', 'lts': False, 'url': 'https://sourceforge.net/projects/antix-linux/files/Final/antiX-19.5/antiX-19.5_x64-full.iso'},
        {'version': '19.4', 'date': '2021-03-01', 'lts': False, 'url': 'https://sourceforge.net/projects/antix-linux/files/Final/antiX-19.4/antiX-19.4_x64-full.iso'},
        {'version': '19.3', 'date': '2020-10-01', 'lts': False, 'url': 'https://sourceforge.net/projects/antix-linux/files/Final/antiX-19.3/antiX-19.3_x64-full.iso'},
    ],
    'SparkyLinux': [
        {'version': '7.5', 'date': '2024-09-15', 'lts': False, 'url': 'https://sourceforge.net/projects/sparkylinux/files/lxqt/sparkylinux-7.5-x86_64-lxqt.iso'},
        {'version': '7.4', 'date': '2024-06-01', 'lts': False, 'url': 'https://sourceforge.net/projects/sparkylinux/files/lxqt/sparkylinux-7.4-x86_64-lxqt.iso'},
        {'version': '7.3', 'date': '2024-03-01', 'lts': False, 'url': 'https://sourceforge.net/projects/sparkylinux/files/lxqt/sparkylinux-7.3-x86_64-lxqt.iso'},
        {'version': '7.2', 'date': '2023-12-01', 'lts': False, 'url': 'https://sourceforge.net/projects/sparkylinux/files/lxqt/sparkylinux-7.2-x86_64-lxqt.iso'},
        {'version': '7.1', 'date': '2023-09-01', 'lts': False, 'url': 'https://sourceforge.net/projects/sparkylinux/files/lxqt/sparkylinux-7.1-x86_64-lxqt.iso'},
        {'version': '7.0', 'date': '2023-07-01', 'lts': False, 'url': 'https://sourceforge.net/projects/sparkylinux/files/lxqt/sparkylinux-7.0-x86_64-lxqt.iso'},
        {'version': '6.7', 'date': '2023-04-01', 'lts': False, 'url': 'https://sourceforge.net/projects/sparkylinux/files/lxqt/sparkylinux-6.7-x86_64-lxqt.iso'},
    ],
    'Bodhi Linux': [
        {'version': '7.0.0', 'date': '2023-03-01', 'lts': False, 'url': 'https://sourceforge.net/projects/bodhilinux/files/7.0.0/bodhi-7.0.0-64.iso'},
        {'version': '6.0.0', 'date': '2021-04-01', 'lts': False, 'url': 'https://sourceforge.net/projects/bodhilinux/files/6.0.0/bodhi-6.0.0-64.iso'},
        {'version': '5.1.0', 'date': '2019-08-01', 'lts': False, 'url': 'https://sourceforge.net/projects/bodhilinux/files/5.1.0/bodhi-5.1.0-64.iso'},
        {'version': '5.0.0', 'date': '2018-08-01', 'lts': False, 'url': 'https://sourceforge.net/projects/bodhilinux/files/5.0.0/bodhi-5.0.0-64.iso'},
        {'version': '4.5.0', 'date': '2018-02-01', 'lts': False, 'url': 'https://sourceforge.net/projects/bodhilinux/files/4.5.0/bodhi-4.5.0-64.iso'},
    ],
    'Peppermint OS': [
        {'version': '2024-04-04', 'date': '2024-04-04', 'lts': False, 'url': 'https://peppermintos.com/iso/Peppermint-2024-04-04.iso'},
        {'version': '2023-11-15', 'date': '2023-11-15', 'lts': False, 'url': 'https://peppermintos.com/iso/Peppermint-2023-11-15.iso'},
        {'version': '2023-07-01', 'date': '2023-07-01', 'lts': False, 'url': 'https://peppermintos.com/iso/Peppermint-2023-07-01.iso'},
        {'version': '2022-02-02', 'date': '2022-02-02', 'lts': False, 'url': 'https://peppermintos.com/iso/Peppermint-2022-02-02.iso'},
    ],
    'Mageia': [
        {'version': '9', 'date': '2023-08-28', 'lts': False, 'url': 'https://www.mageia.org/en/downloads/get/?q=Mageia-9-Live-Plasma-x86_64.iso'},
        {'version': '8', 'date': '2021-02-26', 'lts': False, 'url': 'https://www.mageia.org/en/downloads/get/?q=Mageia-8-Live-Plasma-x86_64.iso'},
        {'version': '7.1', 'date': '2019-12-18', 'lts': False, 'url': 'https://www.mageia.org/en/downloads/get/?q=Mageia-7.1-Live-Plasma-x86_64.iso'},
        {'version': '7', 'date': '2019-07-01', 'lts': False, 'url': 'https://www.mageia.org/en/downloads/get/?q=Mageia-7-Live-Plasma-x86_64.iso'},
        {'version': '6.1', 'date': '2018-10-01', 'lts': False, 'url': 'https://www.mageia.org/en/downloads/get/?q=Mageia-6.1-LiveDVD-Plasma-x86_64-DVD.iso'},
        {'version': '6', 'date': '2017-07-16', 'lts': False, 'url': 'https://www.mageia.org/en/downloads/get/?q=Mageia-6-LiveDVD-Plasma-x86_64-DVD.iso'},
    ],
    'PCLinuxOS': [
        {'version': '2024.12', 'date': '2024-12-01', 'lts': False, 'url': 'https://ftp.nluug.nl/pub/os/Linux/distr/pclinuxos/pclinuxos/live-cd/64bit/pclinuxos64-kde-2024.12.iso'},
        {'version': '2024.10', 'date': '2024-10-01', 'lts': False, 'url': 'https://ftp.nluug.nl/pub/os/Linux/distr/pclinuxos/pclinuxos/live-cd/64bit/pclinuxos64-kde-2024.10.iso'},
        {'version': '2024.06', 'date': '2024-06-01', 'lts': False, 'url': 'https://ftp.nluug.nl/pub/os/Linux/distr/pclinuxos/pclinuxos/live-cd/64bit/pclinuxos64-kde-2024.06.iso'},
        {'version': '2024.02', 'date': '2024-02-01', 'lts': False, 'url': 'https://ftp.nluug.nl/pub/os/Linux/distr/pclinuxos/pclinuxos/live-cd/64bit/pclinuxos64-kde-2024.02.iso'},
        {'version': '2023.07', 'date': '2023-07-01', 'lts': False, 'url': 'https://ftp.nluug.nl/pub/os/Linux/distr/pclinuxos/pclinuxos/live-cd/64bit/pclinuxos64-kde-2023.07.iso'},
    ],
}

def get_db_connection():
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print("Error: DATABASE_URL not set")
        sys.exit(1)
    return psycopg2.connect(db_url)

def main():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    total_added = 0
    total_skipped = 0
    
    for distro_name, releases in TIER2_RELEASES.items():
        cur.execute("SELECT id FROM distributions WHERE name = %s", (distro_name,))
        result = cur.fetchone()
        
        if not result:
            print(f"Distribution not found: {distro_name}")
            continue
            
        distro_id = result['id']
        print(f"\nProcessing {distro_name} (ID: {distro_id})...")
        
        added = 0
        skipped = 0
        
        for release in releases:
            cur.execute(
                "SELECT id FROM releases WHERE distro_id = %s AND version_number = %s",
                (distro_id, release['version'])
            )
            if cur.fetchone():
                skipped += 1
                continue
            
            release_date = datetime.strptime(release['date'], '%Y-%m-%d')
            cur.execute(
                """INSERT INTO releases (distro_id, version_number, release_date, is_lts)
                   VALUES (%s, %s, %s, %s) RETURNING id""",
                (distro_id, release['version'], release_date, release['lts'])
            )
            release_id = cur.fetchone()['id']
            
            cur.execute(
                """INSERT INTO downloads (release_id, architecture, iso_url, download_size)
                   VALUES (%s, %s, %s, %s)""",
                (release_id, 'amd64', release['url'], '2.5 GB')
            )
            
            added += 1
        
        conn.commit()
        print(f"  Added: {added}, Skipped (existing): {skipped}")
        total_added += added
        total_skipped += skipped
    
    cur.close()
    conn.close()
    
    print(f"\n{'='*50}")
    print(f"TOTAL: Added {total_added} releases, Skipped {total_skipped}")
    print("Done!")

if __name__ == '__main__':
    main()
