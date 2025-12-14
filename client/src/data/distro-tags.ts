export type ExperienceLevel = "beginner" | "intermediate" | "expert";
export type UseCase = "gaming" | "server" | "desktop" | "privacy" | "development";
export type Hardware = "low-end" | "modern";

export interface DistroTags {
  experience: ExperienceLevel[];
  useCases: UseCase[];
  hardware: Hardware[];
}

export const distroTagsMap: Record<string, DistroTags> = {
  "Ubuntu": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop", "gaming", "server", "development"],
    hardware: ["modern"],
  },
  "Fedora": {
    experience: ["intermediate", "expert"],
    useCases: ["desktop", "development", "server"],
    hardware: ["modern"],
  },
  "Debian": {
    experience: ["intermediate", "expert"],
    useCases: ["server", "desktop", "development"],
    hardware: ["low-end", "modern"],
  },
  "Arch Linux": {
    experience: ["expert"],
    useCases: ["desktop", "development"],
    hardware: ["modern"],
  },
  "Linux Mint": {
    experience: ["beginner"],
    useCases: ["desktop"],
    hardware: ["low-end", "modern"],
  },
  "Pop!_OS": {
    experience: ["beginner", "intermediate"],
    useCases: ["gaming", "desktop", "development"],
    hardware: ["modern"],
  },
  "openSUSE Tumbleweed": {
    experience: ["intermediate", "expert"],
    useCases: ["desktop", "development"],
    hardware: ["modern"],
  },
  "openSUSE Leap": {
    experience: ["intermediate"],
    useCases: ["server", "desktop"],
    hardware: ["modern"],
  },
  "Elementary OS": {
    experience: ["beginner"],
    useCases: ["desktop"],
    hardware: ["modern"],
  },
  "Zorin OS": {
    experience: ["beginner"],
    useCases: ["desktop", "gaming"],
    hardware: ["low-end", "modern"],
  },
  "MX Linux": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop"],
    hardware: ["low-end"],
  },
  "EndeavourOS": {
    experience: ["intermediate", "expert"],
    useCases: ["desktop", "development"],
    hardware: ["modern"],
  },
  "Garuda Linux": {
    experience: ["intermediate"],
    useCases: ["gaming", "desktop"],
    hardware: ["modern"],
  },
  "Solus": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop"],
    hardware: ["modern"],
  },
  "Kali Linux": {
    experience: ["expert"],
    useCases: ["privacy", "development"],
    hardware: ["modern"],
  },
  "Kubuntu": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop"],
    hardware: ["modern"],
  },
  "Xubuntu": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop"],
    hardware: ["low-end"],
  },
  "Lubuntu": {
    experience: ["beginner"],
    useCases: ["desktop"],
    hardware: ["low-end"],
  },
  "Ubuntu MATE": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop"],
    hardware: ["low-end", "modern"],
  },
  "Ubuntu Studio": {
    experience: ["intermediate"],
    useCases: ["desktop", "development"],
    hardware: ["modern"],
  },
  "CentOS Stream": {
    experience: ["intermediate", "expert"],
    useCases: ["server"],
    hardware: ["modern"],
  },
  "Rocky Linux": {
    experience: ["intermediate", "expert"],
    useCases: ["server"],
    hardware: ["modern"],
  },
  "AlmaLinux": {
    experience: ["intermediate", "expert"],
    useCases: ["server"],
    hardware: ["modern"],
  },
  "Void Linux": {
    experience: ["expert"],
    useCases: ["desktop", "development"],
    hardware: ["low-end", "modern"],
  },
  "Gentoo": {
    experience: ["expert"],
    useCases: ["desktop", "development"],
    hardware: ["modern"],
  },
  "Slackware": {
    experience: ["expert"],
    useCases: ["server", "desktop"],
    hardware: ["low-end", "modern"],
  },
  "NixOS": {
    experience: ["expert"],
    useCases: ["development", "server"],
    hardware: ["modern"],
  },
  "Tails": {
    experience: ["intermediate", "expert"],
    useCases: ["privacy"],
    hardware: ["low-end", "modern"],
  },
  "Qubes OS": {
    experience: ["expert"],
    useCases: ["privacy"],
    hardware: ["modern"],
  },
  "Parrot OS": {
    experience: ["intermediate", "expert"],
    useCases: ["privacy", "development"],
    hardware: ["modern"],
  },
  "Peppermint OS": {
    experience: ["beginner"],
    useCases: ["desktop"],
    hardware: ["low-end"],
  },
  "antiX": {
    experience: ["intermediate"],
    useCases: ["desktop"],
    hardware: ["low-end"],
  },
  "Bodhi Linux": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop"],
    hardware: ["low-end"],
  },
  "Deepin": {
    experience: ["beginner"],
    useCases: ["desktop"],
    hardware: ["modern"],
  },
  "KDE neon": {
    experience: ["intermediate"],
    useCases: ["desktop", "development"],
    hardware: ["modern"],
  },
  "LMDE": {
    experience: ["intermediate"],
    useCases: ["desktop"],
    hardware: ["low-end", "modern"],
  },
  "Manjaro": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop", "gaming"],
    hardware: ["modern"],
  },
  "ArcoLinux": {
    experience: ["intermediate", "expert"],
    useCases: ["desktop", "development"],
    hardware: ["modern"],
  },
  "Artix Linux": {
    experience: ["expert"],
    useCases: ["desktop", "development"],
    hardware: ["modern"],
  },
  "Alpine Linux": {
    experience: ["expert"],
    useCases: ["server"],
    hardware: ["low-end"],
  },
  "Clear Linux": {
    experience: ["intermediate", "expert"],
    useCases: ["server", "development"],
    hardware: ["modern"],
  },
  "Mageia": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop"],
    hardware: ["modern"],
  },
  "PCLinuxOS": {
    experience: ["beginner", "intermediate"],
    useCases: ["desktop"],
    hardware: ["modern"],
  },
  "Puppy Linux": {
    experience: ["intermediate"],
    useCases: ["desktop"],
    hardware: ["low-end"],
  },
  "Tiny Core Linux": {
    experience: ["expert"],
    useCases: ["desktop"],
    hardware: ["low-end"],
  },
  "Fedora Silverblue": {
    experience: ["intermediate", "expert"],
    useCases: ["desktop", "development"],
    hardware: ["modern"],
  },
  "openSUSE MicroOS": {
    experience: ["expert"],
    useCases: ["server"],
    hardware: ["modern"],
  },
  "Vanilla OS": {
    experience: ["intermediate"],
    useCases: ["desktop"],
    hardware: ["modern"],
  },
  "Nobara": {
    experience: ["beginner", "intermediate"],
    useCases: ["gaming", "desktop"],
    hardware: ["modern"],
  },
  "Bazzite": {
    experience: ["beginner", "intermediate"],
    useCases: ["gaming"],
    hardware: ["modern"],
  },
};
