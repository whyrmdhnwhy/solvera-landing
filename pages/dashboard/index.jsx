import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/Dashboard.module.css';
import { useAppContext } from "../../lib/AppContext";
import { dict } from "../../lib/i18n";

const LOGO_H = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPYAAABQCAYAAAAqV4g7AAABAGlDQ1BpY2MAABiVY2BgPMEABCwGDAy5eSVFQe5OChGRUQrsDxgYgRAMEpOLCxhwA6Cqb9cgai/r4lGHC3CmpBYnA+kPQKxSBLQcaKQIkC2SDmFrgNhJELYNiF1eUlACZAeA2EUhQc5AdgqQrZGOxE5CYicXFIHU9wDZNrk5pckIdzPwpOaFBgNpDiCWYShmCGJwZ3AC+R+iJH8RA4PFVwYG5gkIsaSZDAzbWxkYJG4hxFQWMDDwtzAwbDuPEEOESUFiUSJYiAWImdLSGBg+LWdg4I1kYBC+wMDAFQ0LCBxuUwC7zZ0hHwjTGXIYUoEingx5DMkMekCWEYMBgyGDGQCm1j8/yRb+6wAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH6gQHCTUPLgPolQAAMihJREFUeNrtnXmcFMX5/9/V3XPswS73DaICCoLcCqgcIoeKByjGK0ZJDFExGEMI+jXG6M94RBSCGCXeBtFoREBFkUNu5EbuU5HLRXaBZXd2Zrq7nt8fPd3McgmKSsx8Xsxrlpmequrq+tRz1FNPQQYZZJBBBhlkkEEGGWSQQQYZZJBBBhlkkEEGGWSQQQYZZJBBBhlkkEEGGWSQQQYZZJBBBhlkkEEGGWSQQQYZZJBBBj88zB+7Ad8FShkYhkJ+7IZkkEEG3w1KKQzTxDCMcp+bpoU66LMMMsjgpIbCMEwMs7yCUb3+KZzR7lxR6gChfeIrpX7sRmeQwY+Gk3r0K8PAUArXdYPP8ipXpfWF3aTjFf0467xOVMivyPolC5n9nzdZ8OF7ascXm4NrDdNEAVprRDIKewb/OzjpiK2UgTIUOo3MhmXSpP350rXvtbTt1Ztap9YFIF4K4jhk5ViEwrBvVzEbFs7lk3FvMX/Se6po964DZZgmiKBFIEPyDH7iOCmI7ZHZQEQjWgef12vSTFp2v5RzLu1Lo9btyM5VODGwEzZKBNNQGCjQGiUQioTJyvZuaufmHSye9hGzJ77N8rkzVDxWGpRrmiYigk6rK4MMfkr48YitFIYygPIEq1LnFM7udom0uaQvp7XtQIUqOZAEJ0XmkGliKDAUKBEMFIYSDAElntqNKMLhEFlRkAR8uW4tC6a+z6wPx7Nm8Tzluk5QX4bkGfwU8YMTWxkGShnoNHLlVatFw45dpFWvvjQ+tzP5NauhBXRco1wby1BYloGpPJtbKcEElBIUYKBQAorU/0VhuoI4LgYmWWGTSBjiJQ6fr1rKvCkTmT/9A9asWhzcv1Keg86zxzMkz+C/Gz8IsZVSKMNISVPPvg1FojTs0EVaXXo1jTv3olLtOhgakgmNtm1MBaapMFMONFOBqRSmEpRKkVmBgSepDRQGAgiGNjC1J8VNLShbMFzBNAyywyZZIYjtTbD2swXMmDqOubM/UJs3ryvXXiPV3ozTLYP/RnxvxPbJzEFqbvXGzWjWo4+06t2Pumc2x7AgWQZOIoHCU42VoTzCKkGhMAxP9TaVF1FjBMROkReFIkVwEQxRWBrvO1cwNFiiUBoMV6O0JqIsciMGYROK95SwcvlcPp7yDrPnTlLbd375Yz+XDDL4TjixxFYKlbKb051gedVr07hTL2nW+2fUad2RnIq5kAA37mCgU8ta/u9VSqX23g1DBSq3J6HFk9wolLieEw1PspuiMFOENjSYLhhaMFNEVxos8QkPpqtRrhA2LLIjipABRbt3s2LVXGbMeY+Z8z9WX27fgvLuKJDipmmWW4LLIIOTDSeM2J59emCwZ1eswqnndJYm3a7ilHM7kV+nLiLgxAXlJlFparbyG5JqjVIKvH8pG9pTv1EemREXywwRzTIJh0DZ4JRpTNvBEgMDj+CmC6ZWAcEN4YAkF7xrtKeuowXlCCHDpHZ1E23DwPuvZ9ykscoyLdyM7Z3BfxFOqMQORbM5tW0nadKjL/XbdyW/dkMMC9yEoO0khh8VZihPQpNyeKVUa1Gea1uhPBKnnGGIIKIxMLGiJuEskKTw1aolfLlwHvWbtKBhi/bk5oaQMnBKXbAdLFGEXBNTFEpLQGRDDryHUu9ojYVFpQqKpSvn8/DwO1mxdpGyrDCOkwTgthtul2su+Rn/nvQWL7/9giqLl6GUytjhGZx0OGHE7tj/D9Kqz81UOaUpRMApA9uxUaK9cFAj5ZRK1apSzi8VSOnyjRJAtAtozEiEcI732b4vv2DjJx+x7L032bxojnKTSRQGDZq3ltbdLqNFp0tp0LAFuVELKQGnxEG5GkurA041FJYQEB7HJS8rjOMkGDtuOKNfe0jF46VYVgjHsalWuTpP3TtCru99LQpIiKb5pWeqDZs3BOp5BhmcTPiOxE5RUBn86u3lUvfsZsSKUk4ww0RM48DOq5SdbPpslpR0TungykhFhGkQ0SjTIhw1wIB9u3axeeE01k1+h82zp6rY3qKgBYZplotSU6bF6c3aSttOl9Om/cWcekpLoia4pWCXORhaY2IQwkCJYCmTvCxYtWYhfx/9e5atmqXSyXpJ18vk4bseo8XpTdhTHCNkWcR1jPOuPUdt+CJD7AxOTlgnpBTRxPbtIxnTnlptesUKgognmREQFI4o/D0bCsMTw2iwXZRpEMrywkPL9sXY8OlCVr//Bus+eU8V79wWVGeYVio8VKdIrVCG53jTrsPG5fPVxuXzeevZBzizWUfp2Olq2ra6lNo1G2C6kCjTJF2H/Owwjp3klTee5sXX7/ektGnhuA51a5zC0NsekusuvRFLK77eU4ZlWYCFwvSNhAwyOClxYoitQJkGYCCiEC/4C41nQx8wQb11ZrT3t0YARShsYeWauHFhx6pFbJz2PmumTWDnqqUqxfxUYItCa10uuMUvV7T4VwYkd+0kq5Z+olYt/YTXc++nTdvucn6Ha2l+5oVUzs9j+co5vPDaPaxYPUspw9s55orQ58oBMvQX93Fm7brsL05gmBorZOBqwVSCbeuMlM7gpMYJktgHXqIV4hvJihR5U5eJf6FGhcJEsw2UBft2fMWGt//Dqklvs23JPOXaCSDlFTctRHsx5MfmokojeRC2CqUlRcz85E0185M3aXBKCxo1bCOfzByrbLsM30F2yhnNZeDvnuKKs7sRKRN27y0jFAqhMHAdj8iOUJ7Y/6N+MyM10YpI8J6Z7E4efEdiS2Av27FSSJnOWnuk1EjK0+0LXgMzamJkQXxfKZunf8KGqePYPGOSKtm1IyjVSMVvi9bIIdL5eJonaPHsb5VaYxfRfLFlOV9sWa78xAyOk6Tbtb+SO29/nDOohLvbJmEJViiEFlDaW3gTBBODeNzFth2/B741/Ag3nxiH866n7yv3rzkZvPAZEp/c+M4S2x+UpUWeQ0trwVAp+xqNRjxiGAbKEHasWcKmGRPZMHWc2r1+eVCOR2bPcaa/h+APjxBeuaYZAsB1beqc3oQb7n1Eep57BflbwYnbhEKe00+nnHko8WxqEcRQxMrilCVifsnH3RY/+4vW+lsFupiphBM/Rsir/7xPP/10atasKa7rBibS8uXLVTwe/0Hbk8HhcWJUccCxbbTGU4NTwSSe4u0tL2ntMPFPP2fjtAlKUuvCftip6O+HzIeDYVq4rg1A95/fITf87kFOMSuTtS6JaRiIaeKK9kJatbfe7qYUDiXeoC4u3k+sLPbt6k/zolerVo1mzZrJWWedRaNGjahUqRJZWVleWK1SJBIJdu/ezY4dO1i7di2rV69m06ZNyrbtH6SvjtR+13W59957pX///jiOg2VZlJWV0aJFCzZsyKwUnAw4AcT2VMVYyR4cPOeTiKQWwry4MReIZIVJ7t+HOEnMcATt2ClV+1sSOs1+loNCWA9/uRF4zavXqc9NfxomHS+7mpzPBWt7HDNkpaS0xnMWBH47DFFoBO045GWFEQ2JRBmpyo+jyZ5k69ixo9x+++107tyZunXrHvPvS0tL2bBhg8yePZvx48czb948FYvFfhTV3Nc6/LozG2ZOLnz37H8pE7CkYCtai/cScLW31IWY4IIRNmjYpQ8A4jrfSMSjNtpIZUPRLlq7iPaCYI6U58xT8zVau1zY9yb56ztzpOslVxNdZRPd7mJaYTTKX0ZHY6C1QmtwNSQdjWhFxbxsdu79mlffewYh5TQ6Bmb7tjTAo48+KjNnzuSGG26gbt262LZNPB4/qkruOA7JZJJoNErLli0ZOHAgH3/8MTfddJOISKCa/5Dw+zpD5pMTJ0wV37/zS4yQwgxnYSfjgTrpEcDAiUP1Fh08aZ1MHAhSOQ54hAatXQwzRJfr+stpzVry/ujhamdq26VhWkEmFk/VN9GuQ6Xqtbhp6CPS+ZpfQCnwWZJoiQmmQqc0DFd5O8DE28eC1oJSQoWcEIlkktHvPMezbzyhtn71+XGFkvqS+rHHHpMhQ4agtcZxPOdbKBQiFApRWlpKQUEBsViMZDKJUorc3FwqV65M5cqVU2voHpLJJHv27GHixImpiNtjb4dPyO/qlPMnqsOVd7j/H087v0sZJ/IeD67/4N+m15Vex9HKOlJ/+b87Uc7R705srVEoitYvUAue/5vUP/9KajZqhF0qaMfGsEwEsOOaSvXOJP/Usyhat+T4iBE4mzyp1qLLpXL5HfdyxjkdCVvQ4eLr5ZOxz/HBq0+rwh3elks/Ik1chzYXXi43/2k4tRqeil3gkLVNEy41ECvlxRcv8s1L0mCgxUVrTW52mEgE5i6ZwRMv38PSVfOCp3GsbfftzZYtW8rgwYMDyWwYBoZhsGTJEkaOHMns2bNVQUEBiUQC27ZRShGNRsnPz6du3brSokULunbtyvnnn0/9+vUZPXo027Zt+8adZkba+v83DRpfsziWpauDv0/XSo7m4T+eSeh4rk1v94m6xyOV4/ep67pHrSt9xcOv61ju6UQ4R787sZVCRGPl5kvVli2Y8+y9VKnTiDY//wO5NSphlwjiOCCaaH6U2m27SNG6JQr1zZFbQYKG1MBt1O486fXrIZzd9XIsBWV7EiSASDiPPrf9gQuu/IXMHf8aH499Tm3/YgO5+ZW5euCf5KIb70Qpk/gXSXJ2KYyEwjVAuSBK0Mrz3CulcMUmYoXJyYK1n3/GK+OGMWHaGOVPKiEzROVKVSjY/dUxdY9P7B49emAYBrZtB6SeN28ePXr0UCUlJYf8TkSIxWLEYjF27typFi5cyPPPP0+VKlXo1auXTJkyRfmEPVLf+Y4uHxUrVqRatWrk5+dLugawb98+vvrqK7Vnz55yE48/uI5tGCiUUgKoUCgUDEpfMjmOc1yD1L/WLytdwvnaDhBMbH67c3NzqV27NhUrVpRoNBrcw969e9mxY4cqKioKrj3apGiaJqZpliNkuj8BwLIsatSoQW5uroRCIYqKitSOHQeWbdP7zjRNKleuTLVq1SQnJ4fs7OwgLZfruhQXF7N7925VUFBAunP0224y+s7E9ist/Hy9ymnQXC554iVmPjqYMb88V7W55k4567L+hCvmYO93SCYdarXtwcoxT3mL3cdQtrgu1U89g0tuGyrtrryecCRMotjB0d4WSwDXdthfpMnNq06fAb+ny5X9ZcHkdzilSStOb92a2F4bc58mtMsAWyFK42qVSs/gbefUWmNYJnkVwuzeW8jI1x7l3x88o8oSsWBQ1alaj3/86XkZ8+GrvDlpjDINE1e733gPANWrVy83MEzTZMKECZSUlJCTk0MikTjirO6rfCJCYWEhY8aMOeqs6E8mrutSt25d+vTpIz179uSss86iatWqRKPRQJoAxGIxCgsLZe3atcyYMYOJEyeyYsUKlV7W4eo40md169Zl7NixEg6HEREsy6KwsJB+/fqpwsLCw95j+r0C5OTk8Pbbb0udOnVIJpMByW688UZWr16t/Lpc1yU/P5/LLrtMevfuTevWralVqxbRaLSc+VJWVsbu3btlzZo1TJ48mbfffltt2bLlEOL49/uXv/xF+vbtSzwexzAMHMfhuuuuUxs2bKBjx47Sr18/OnfuTL169QiHw2RlZTFmzBi55ZZblD9xN2zYULp06ULHjh1p2rQptWvXJj8/n3A4XK5t4JlXxcXFsn37dpYuXcrEiRN59913lT+p/Si+DKU8gnUf9rbcvU7kDxtFrhg5TqJ5lcmr1YDOQ5+V/h8Xym3LRH72YUyyazVM/c44QnleWGhu1Vp0vf0+eWRRkTz7pciIla6MWJ6UUStc+cdnjjy33JHRyxx5cZktryx35JWltry6OCFjPxMZt1HkjdUiryxOyCuT4zLmlaS8+Zot/3nNlndfs2Xivxz5YIwrH/4rKZNfc2T+f0RmjI3L/935T6lfp3HqIR9wSl190bWy5F8bpWyGyNkNW8uRBvfB8NWq+++/X0REksmkOI4jIiIzZsyQnJycw96/LzH8V7ptZh7lQAS/TXl5eTz66KOya9cuSYfWWg7GwZ+VlZXJa6+9Jg0aNChXZvrfY8aMCe7H/82ZZ54Z9Mubb755SD2DBw+W9D45Wn/deuuth/x+6tSpYllWoPEA9O/fXzZs2CDHi927d8uQIUOC9vr96df/+uuvH/KbSy65REaMGCGu65b7PJlMiuu68vrrrwfsu/jiiyWRSBx3u9Lx0UcfSbVq1YLnfjw4IWfiqNTm6t0rFqE0xArKaNzjSm749xLJqV5PZjz6G/XWTW3VouefABWnVuuufgD4kUoEpejx+z/LVQ8/hJFVieLdcW9DmGGiteBqcLVCi/L+dkltOLGwky7Fe5LYZQ56p6C3COIqXBe0a6Bdzz5yXIdIxEvYMGvxh9x2f1ceHnmr+nL7esCz6ds2OUfG/r8J8tzg1zm1+ums+nwzXxZsOWanlX/NpEmTAtXUV6E7derE7Nmz5Y9//KN06dJF6tSpQzQaDdSz9JeIBAP6SDasL21OP/10pk+fLn/84x+pVq0ayWQyUF+VUjiOQ2lpKSUlJTiOU87DnUgkiEaj3HjjjcyePVsuuOAC0VofMokdzVmmteb//u//1L59+wKPvtaaO++8k0qVKh2iWqeXobUmEokwcOBAtNZB223b5r777sNxnEB6Dxs2TF544QUaNmyI4zjlVPQdO3awcuVKli5dyrp164jFDsQdJJNJqlSpwmOPPcZTTz0lh2tPPB5Ha00ikcB1XZLJJCNHjuS3v/3tIX0RCoUwDANf9VdKsWjRIvX1118fco8lJSUUFBTwxRdf8Pnnn7NlyxYOVr9t28a2bXr06MGLL74o5rc42eYExYp7g+yrFXOJl7lghSnZnSS3+ilc889pLH79CZn3zJ/Vwqf/oNa9O5qsihVTC92HV2MFQWn44K9/VMXbd0nP3wwllB3FiXkP1c+GgvjbTBTaCw5H8IJKRExiXyQxvsLbwOEKog1Ao0XIjoaJhmHF2jm8/cGTzJz3jgIvKs11bWpUqcUd1/xebur+GypEcijeV0LF/BzWb1/D3v2Fx6we+aRYuHChGjVqlAwcODAgasqpRsuWLQHYs2eP7Nq1i127drFlyxa2bdvG2rVrWbduHevXr1dFRWnbVQ8iuN+eqlWrMmHCBGnatGmgwvoq8bhx4xg3bhwrVqygtLRUaa2pUKGCNGjQgO7du3PjjTeSl5eH63rOwzp16jB+/HjOO+88WbNmjfomDcUffKFQiI0bN/Lcc88xZMgQHMdBa039+vUZMGCAPProo+pw9q3vE7jmmmvk7LPPxnVdDMPAsiwmTJjAvHnzlGVZ2LbN4MGD5e677w4cjb6k/ec//8nLL7/MmjVrVGlpKa7rEg6HqV+/vvTt25ff//73VKlSJbD577rrLhYsWCBjx45V6ZqEl0PA8MZb6v20004DPLV+/vz5LF++nK1bt1JcXEyFChXYuHEj3hgy+frrrxk9ejRXXnkl06dPZ8WKFaxfv56CggJVXFyMH6GnlCISiVCnTh3p3r07Q4cODSY/x3Ho3bs3F154oXz88cfqB0/JFTzQCvlcN36z3LFA5I45tgyclZTfznHk95+J3PzmZ3JG1z4Htmcb5hFV8YPRtGtveWDGNhm1UeSJRQl5apEtIxa7MmqhI/9Y6MizC2355wJbnv/UkRcXu/LifEeeHhOTUX8vkdHPlMrz/4jLi88m5MVny+T1F0Qm/kvkH4+vk4s63yL+w/TDTJVSXH/JrfLpK5/Lrg9EPn8zLpvfjMnnb8WkeIrIPTc/7KmTxrHPib4jyzRNHnnkkXKqnOM4Eo/HA5X2SNi2bZtMnDhRBg0aJA0bNjyk7/37GDZsmIiIJBIJcV1XtNZSUFAgPXv2/MZZqEmTJjJ37tygXX6bJk6cKOn3AAdUVf+aRCIhTZs2FfCcSkopatSoQUFBgWitxbZt0VrL9u3bpWrVqocsFfn/j0QiLF++XEREbNsW13UlmUxKhw4dxL/u9NNPp7i4WFzXFcdxxHVdcV1Xbr755nL36Gs46fW0adNGvv76a9FaSzKZFK21rF69WrKzs1FKBbbvK6+8GrRBax08swkTJkizZs2+sS+VUoe1pb8J/fv3L9f/WmsZOXLkN5owB+OEqOKeimlg79/HjhWLUBZoW3v7lrWQLExQqX5zej/8Dpc99LrUOKOViHa9dEemxZE85P4Be6unv6dG3NBJLZn6HuG8MBoT19a4KUktLmgXsARJakrW2+jdgGlguwZJWyNYZGdFKd6/k5f+fQ9/+EsHNWXGS8EZvK5r07rJ+fLyA5PlkQGjqZbVgMI9cVwUyrCAEAkbFq+d/636x3dm3XPPPapr16688cYbbN68GREhEokQCoXK/cZXQ/3lrzp16tC7d2+GDx/OokWL5KmnnpKcnJxARXddl6pVq3LDDTcEzjm/nFtvvZWPPvpIWZYVSKD0l2mahEIh1qxZo/r166d27NgRfKe1plevXrRo0eKwKnm5Z5XmSTcMg4KCAkaPHh0Qy3Vdateuze233y5+u4OBmNJALrvsskBa+59PmjSJefPmqVAohIhw5ZVXSoUKFQLPu2EYjBo1ipdfflkd3IcHLxktXrxYPfPMM+XMjyZNmtCuXTuRNC9+ekihfz/z58/nqquuUitXrlR+v/l96tv+6f2RbgIdqc/8l/+8li5dGtyT/12TJk2CdhwrTliAihdUDVvnfsiZ3fthpDQGJQqwsEuTCELDi67jtPaXsfqDF+TTMcNU8a6tqQdYPhmi3+niupimxZ5tm3lhwOWq0y/ulot/8wC5ObnYJUnPcScKw4TEHiG+2YUywTIFx9GYhMnOClNcvIvJU15kyvRnVGHh1lRqJgNXu9SsWpdf9R0iV3f6NTnhCHv2JQmZCss00crbihoNWWwv3MWy9QsVEOwaOx74D2rmzJlq5syZ5OXl0ahRI2nTpg2tWrWifv361KhRgxo1alCpUiUOdqwlk0kMwyA/P5+77rqLZs2aSZ8+fVRZmRfe2qxZM6lRo0YwmE3TZN68eUyYMCFQ445kPriuSygUYvv27bz66qsMHTo0sIUty6Jz584sW7bsiLbe4YI1lFL8/e9/V/3795datWoF9d9xxx2MHj2agoKCcmvKlmUxePDg4Pe+N/rxxx8vV1fr1q2D+/DJVLNmTR588EHxfRTB+EkzV/zyWrRoUW5CNAyDli1bMmPGjEMi6tLJPmLECGzbJhQKcbR4/fSVhLZt20rbtm1p2rQpdevWJS8vj0gkUk6b8CcgrTX5+fmUn2AOSOpjMf18nDBi+yGiOxZNVft3Fkp+bj5uUgfH+CgMDBGcvWVYRphzrhpE045Xyfy3n2LJhOeUXVaKlyTBSOU6Sx90TpCjfOYrw9Tni2fLz+4dxWkt2qBLAXEp+8ol9oWLchWWcnG0Ijcrl2RyP9NmvMSkyY+r3V97J3FaZhjHTRINR/hZzzvk+u6/o26VOpTFHfbZCUKWhcYLizUBFxcrZDBvxSx2FX0VbP887j5KDTJ/MBYXF7N48WK1ePHiAw/EssjLy6NGjRpSp04dzjzzTDp06EC3bt2oUaNGQALbtrnooov47W9/K3/9618VEHyfPpjXrl17zOGfPpFXrlwJlF9DbdSo0SH3cjAOdqD5tubIkSN55JFHUs/SpXr16tx9990yZMgQlR7scfnll8u5555bTlr/5z//Yc6cOSp9TT4nJ6fcKoGI0K9fv+N6Fv6uNL8/K1eufMT78+vat29fQMQjwf++ffv28tBDD9GlS5fjVsePh8BHwok7KV4EZZjEd21h18o5RCpauHYS7TikXNgoVzDFQjlCvChGVm4tev1mGL/6+xxp2e16MQyFaDc4pK9c8b7aZZpsXfmpGvHLLmr8qIfYt7eI4s1J9m5I4toarQXLzAUs5i8Yy5PDL+K1Mb9Ru7/ejGWFAXDcJOe3vUSefeATufOaJ8iN1GZPcQKNAsPyYt1F4WqF42q0A5ZlMHXR+16nfcuzt32Vyx9M6XarryI7jkNRURFr1qxRU6ZMUU8//bS64YYbVMuWLdXYsWODweh7hq+44opAjfdDUcs94GNYkktvH3CIWSAiR1Up069Lh3+Po0ePVl9++WU5yXPrrbdyyimnBNpFOBxm6NChwfeGYZBIJHj00UfLtQ04rLQ8XjL4/R0Oh8stnx2uvHSJf7R6/O+7d+8uU6dO5aKLLsI0zXLtdV2XWCxGSUkJxcXFwWv//v0UFxdzuGCl43mGPk6cKu71AEoplr70ZxUNG9Lg3N4YLjixstQMYqJEUKIwxMSN25TFklSt04J+Q8fQ/uJfybQxD7N+6VSFeOq5pFIP+9CuizJM7LISPnrmflW0ulAuvexJtF1GNCsHSwkbN07n48mPsH7txwrAsiI4TgLHSdLwlLO56cr7pEubfpga9uyPY5mKkGl6nnWNl/pYe+TLyQmTkw0ffDqNaYve96K9vmV+cX8Zyx9YvmRNlwDpkijdMfbVV1/xwAMPcM011wSqnmEY1KxZkwoVKlBUVMTmzZuxbRvLsoIB2Lx583JlH21g+t+3b9++3GdKKdasWXPUeztc+KM/ARUVFfH444/z9NNPB9K5YsWK3H333TJo0CAlIlxxxRXSrl27ctJ67NixLFmyJJDW/sSwc+fOcn1nmiYPPvggs2bNIhKJHNZznK61pNuwvgmwZs0a5d9H+vUH38839V04HOZvf/sb2dnZJJNJLMsiFAoxY8YMXn31VVavXs2+fftIJpMqvc98U6l58+Yyfvz4w7b9eHBCiS3ixY0XblrGe0MuUw27Xittrh1M9UZtMOKClJWhleGd8SGCARjKwCktoxSDOmd25ab7z2fDgndk+luP8+XGJanoJ293VmD3aDdIaFi2fy+WZaDI4cvNs5g96ylWLJugRFxMM4QWF8dJUKlidfpdOkguPf8O8qP5xEodDENjWSE8ZVtQ4s24rqMJGRY5FUw27VjHP975f0yc+a9UPlUD4fiI7T+Y/Px8+vbtK+PGjVN79uwJvk93lBxuMPnSsmnTpuWkhohQUlJCaal3RPC6devUhg0bJN3Z0qpVK37xi1/Iyy+/HDh8Dh6g/qC0bZvmzZvLtddeW27NPRaLMW3atG818P0J6IUXXlC33nqrtGjRAtu2ERFuvvlmnnzySbZs2XKItC4pKeGxxx47bD1LliwpF43n982f//zn75xh8nB9cyymjD9JNGjQgMaNG5eLO/BDh5PJ5DfWX7ly5W9U948FJ04V9zsGTyWvdnozNk5/Q705oK2aNmwAe3duJJybjalMtGN76rkWxPUIpUSI748RL3M5o93PGPDn6fTr/6RUqdbA25opgmGkedBT2zZDoSi7v1rHW2Nv4tlRF6rPlo5T3hlgYVzXRqHo1fkWefJP86Rfz3uBHPbFEmjD2yvuOS28QBfbdbFdyMq2iEuMUe88xqW/O0t9umKqqlG1buqEkm+XMUVEuO222+SFF15g4cKF8vDDD0uHDh0kLy8v8Jj7QRbpL9+507t3bxkxYkRQpq/mLlu2jEQiQSgUIh6P8+yzzx4yMEaNGsWvf/1r8YNTDg5+8T/r1q2bvPPOO4EDx6/7nXfeCRIopE8qBw/sI5FdKUU8HufBBx8M+sN1XfLy8vjlL38pV1xxhbRu3bqctB4zZgxr164tFw/vv0+aNEkVFBSU8/xfffXVPP3003KwrXw4hEIhOnToIPfdd5/k5+cf4tH27+fgv49F3bcsSw5eYisuLuZYSN2qVSsZMWLECdnhdcJz6PoZUc687JdyRq9fMGf4XWr3hiWEcvJo02ewtOr5SypWqo1TmkAcx5vV8I7i8Q7WU5A6/jY3K0Jp4XbmTH6auVNHq9L9XoDGAQkOFfJr4Ng2ZbFCFArTCgUnd7Rs1kOu7DWEFo27oR2w3TLCpoWFf3Kn8s7VRqMEsrNCKANmLXuXUf++R23ZvpZfXf4H6XvhLdzy4EWqoGjHccftpkeDzZ8/X/Ly8giHPVtfRPjiiy9Ys2YNW7ZsYdOmTRQVFaG1Jisri6pVq3LaaafRsmVLWrVqBRxIpxQKhXAch/POO48FCxYoXxJblsX7778vF110UbDhxCfAggULmDRpEitWrPDVQSpXrsxZZ51Ft27d6NKlSxCZprUmHA6zdetWzj//fLV169ZgsGqtGTNmjFx//fWBlziZTNK6dWtWrVpVLi97ej8ATJkyRbp27RpEkO3du5f9+/dTr169YLIqLS2lXbt2rF+//pCNLn7ZKS0k8Cb70nHjxo2MHz+eRYsWsX37dmKxGKZpUrVqVerVq0fz5s0599xzad68OZFIhAEDBjB69Ohg1cB/f/HFF+WWW27Btu3AHr/44ov58MMPDxso4o+LnJwcli1bJqeddlrQrpSfgX//+99s3bpVJRIJRIRoNEqdOnWkefPmdOvWje7du5OdnR2ML9d1sSyLWbNm0alTp+Pi6olPju0nLgyF6ffyOqlesyarJzzPwlcfUiV7CqhY41TO6TNEmnW+kWg0FycW85xqWHgbMlJnXWuNcl0sM0J2NERRwQbmT/k7c6a+qOLxWEBwf4ks/SieU+o1o0/v+6Rti75YEiIRjxEyTSzT8A7wI2UGYIA4ZIciZEVh1eeLeWn8X5izdKKqWaUeD97+T+nXpSdPvPoMD79yhzrcktw3wR8Ew4cPl0GDBgWE9qPCjtVj6quvoVAIpRS2bTNgwABeeumlgEj+4KpSpQovv/yy9O7du9xv/QnlSPCjsXzn2Zo1a7j22mv57LPPgjr8+3n11VcPIXbbtm2DDRoHE9v/XdeuXWXKlCmBV9onpK81RCIRP3TzsOV4z937fNCgQTJs2LDAkWjbNpFIpNy1fr8crE347Y7FYpx99tlq06ZN5bZjjh49Wvr371+O2JdeeikfffTRESPA/M8HDhwoI0eODOpJn1zLyspIJpNB/EJWVtZhn4PfdtM0mTt37nET+4Sr4oh4myfsBCvf/jsqHKFF3zu44bnF0uqyAbK34HMmP3ubeuNPF7Jm/rsoI0okkoOrBW1rcFOngWhv/dt1HPYXx8jJb8RlN4zkrgdmSNuOPxPLCpcjmeMkyatQnauuuF/+9IeZck7Ln5GIQzzhJ30wvHznGhxRJB0B8bSC3fu/5Mmxv+NXD7RVc5ZOVFd3vV1ef3CJXNi8J+u3lTB2yjO+Lnbc3eEP4Mcff1zdfvvtzJo1KxiAB5M6fT3Tf/kIhUKEw2Ecx2Hy5MlceOGF5UjtNc9TewsLC7n88svV4MGD2bZtW/DbA49IDvu37+j5+uuvefLJJ7ngggtUOqnTEY1GMU0zeM/Kyjqq99ZX66dPn64+/PBDQqFQORXYsiwikQilpaUMHz5cHc1h5EvCESNGqJ49e/Lpp59iGMYhpIbyGzzSEQqF2LJlCy+++GKgJqf3RTgcDu4vFAoF5P6mZ20YBk8//bS67777KC4uDn7rIysri/z8fCpWrHgIqZctW8awYcOwLAvLsoI25ObmBtccqyPteznOQqUSGYayK9F35AKpUqM+hrYIW4rNc99l3usPqYJNSwA49exe0rbnnTRq1ouQYWCXlaHEU8WVeNHfhjIQcRFXEbGysUzYsmEq86Y/x2eLxyvLinDeebfIhZ1vp3bVM4gnkhjiErIsTEVKOnundqJTjrGoRfH+IqbM+ydvffSk2rt/F43qt5RB1zzBeU26EU9q8ioYvPXJSzzwfH9lKONbe8MPRsuWLeWCCy6gRYsWnHbaadSrVy940AfHgO/fv5+dO3eydu1aFixYwCeffMKyZcuOuqUy3VyoVq0aF198sVx00UU0b96cWrVqkZubW06t3rdvHzt37uSzzz5j5syZfPzxx8G+4oPr8P9/9913S48ePQLNIx6PM2jQILVt27Yjmiv+b1u3bi0PPPAAhmEEGyj8mO4JEyYwfPjwI0rrw5VnmiYXXHCBdO7cmXbt2tG4cWOqVKlCJBIJyvATQ27bto3FixfzySefMH/+fLV3797Dljlw4EDp06cP8Xg80CyGDBnCkSa6w/V/o0aNuOaaa6RTp040aNCAypUrB9qQ67oUFhayadMmli5dyowZM5g2bZqKRCK88sorkpOTg+M4RKNRli1bxuDBg39kVdwvOGVrN+7eX3rc9QLuvjhKhEh2Fm7xXpZ/MIIF7/9dlZV4dnPDlpfIOd0HcmqTnlganNRJloaooJEKBdrFdYVwOIeoAV+sn062yua0U9vj2BrtxAiZBiHDxFAGpkpF8WjBEpPcbJNE2X5mLxnLO5OfUtu+WktWJIcbew2VqzsPomJ2BeKJJJGwQamzh5sebK92fO2lQvouxD5c4gMfubm5VKhQgZycnEMSHOzfv5/CwsJy68jpO8SOp75QKESVKlUOS+zCwsJyZPTV2xMRLPFt+upY6z0cyXJzc6lYsWKwU87ftbZnz55yu7y+z/s8uF25ubnBXmzfMblnz55D1q1PVIbX7+8AKpVKZGBYXPbnT+SUszrglsYxtcZUIXLDIfZtW8G8D/7GoumvBctajVtdIef3/D31G3bETQh2sgST1DlfKfvd0MpLWSxCjpVDVCvsRAzLUFimt7vLBO/87VQce3YkBBrmL32d9z5+ko1fLlYAPTveKD+/+F5OrdaEZJlGK42hoFK+xZNv3surkx75Vrb1Nz30dGIdy6A6XJqdY3sMx54K6HhS8hxu2+ZxZls5YvTa8Q7sg+PUv2lZ6liuPRE52w5OS3Ws7Tkh+eKO6+rjhDJMRLvUPKOTXPV/H2FqI3VOtcJwbMKhLCKWwYaFbzLl3QfVV9tWAxCO5NDq/P7SvttAqlRtjB1P4NoJDMNC4XuyvTPCTFeThYmpDIyUU0ylcpkrEbKjEcIh2LB5JuM/eoIlK7wEgPVrNeHXVz4sXVr3wUlCIpkgpCwEITdqse6rFQx49DyVSJSmDhf8/iTXkRLcpT/QE1H/sSTS+yngaEtvP9Y9Hq5N32d7vvcjI32VvMNVD8kFV99HYl+ckPLWrXFdxIXcrGx0rICFM0cx++Nn1P5iL31OhfxatOs0QNqe92tyK9QikYgjro1lmBgoRCtCooj6HScKJS7iasJWFllhxY6vVjJ5+hPMXTxGuY5DVqQCV1x4m/Tr9geq5lYlFnMxVCp+W8A0NOGQcOeInixdO/2YbL0MMjjZ8P2fBetvTTPC9LnrfWl81oUkSkox1YGECaJtQkaYnOwoRTs+Y9qkh1m84C0lXvYEqlRvRLvzfiMtzr2RnArVscsSoB0MsQhhEEFSEtwhbISIRix2F37OjNn/YPanL6hYzLPjz2vdT/r1uIcz67XCSQiuJAkZFt404eUdr5QfZtS4B3n1/T+fcBU8gwx+KPwghzz7u6FyK9XlurunStVqjUmWlWApC0On8p6IC64mGs4hYik+X/cukyf9lU0bFwdtrFG7Oe273iUt2lxH2MrCLk2icIliYBIiJ8tgf0kBc+c/z6w5o1XRHi8VcYN6Z3NV93vkvBZXYbjemmvI8uxxJQoDLw1SpZww7386lkde+blSKrXx5H/1OM0M/qvxg53e7pO7Su1m9LttouRXboAbK8E0QpiiPentsQm0QW40CyX7WTj3OSZ/PEzt3Xsg3W/909rLeZ0H0fiMy4mEsskyQBybxUtf4eMpf1O7dnk5yyrkVqN350HS64Lbyc+uRFlZHEMUpmFiGQrD9y47DpVyQ8xdNZn7R1+pbMdLW/NTsTkz+N/DD0ZsOBApVrnW2fTtP1aq1WyKU1pC2PB2fRmp5hiiEFdhqTB52YrdheuZOWM48+a/rJLJsqC8eqd0lIt63EPEspg8+f+xedOclHfd4oJzbpDLuw6lQfUzSSQFwcY0TM/xJoJpKO8QPu1QISvEglVT+OvL16r9ZYXfer91BhmcLPhBiQ0qRW6H/MoN6HPLW1K3fluSJSVYqUPzlCjPqy2G5yBzXUJmhKywwdats5k+8zGWLX8vSGlkKAXKKxPg1Pqtpd8lD9LqzEvRSbDtJJZpYBh+ualAFcAyFPm5FlMWjWPYaz9XiWQpSpnBcbsZZPDfih+Y2KlKU8tg2bk1ufS6F+SMppdgl8S8TSDK9KLERNKWtrxjdqPhXCzTZv2md5kxfSTrN84K2p+fX4NenQfJhe1vIzdSkbK4l0bIUilCp94VgKsJWSHCIcW7M0bw8sQ/Ku0mMpI6g58MfhRik8o3JuJiGBadev1F2nceCq6LTia8kzPFk8ZKkzqMF08qC0QjOZjsZ+Om8Uyb9jR1azXjyl5DqVGpEbGYC9rGTK15myiUEvwDd7XrkhOJUJrYx+h3BjJr8b+UQkGqPRlk8FPAj0TsVOVpErJJi2ulW+/HyMurTyJW6qnMylPHPa+5oBBQIK5GKZOcrGxCTik1cnMQgXjCTqUt8sJQg9B75e0WMwyTvKjBxm3LePbfv2HDl58qwzAz3u8MfnL4UYntN8ELAnHJr3wqXXo9Kk2aXoN2HJxk3AsLNVJbOfEIaHgBpiQdyA+HqRk10MFmEQluzAAvIQOaaCiMAqbMe5o3PviTisX3klmnzuCnipOA2KmGpOxugKYtb5QOnf5ElaqNcRKliIBleET1iWuJt/2yQsiiVjSEAOqg7CZau4TNENGw4ovtn/HG+/ezbO14z3OuzG+VQjiDDP4bcNIQGw4c0ieiycquSbuOd0urdrcRieRiJ/djoL1rxLe5DfLDIWpFvUSESqVib8WzmXOyDYr372HitMeYNu8fKp4oxlAmwo+zaymDDH4onFTE9pGuItes217O63wfpzXsgaFCJBL7UaIxlYUWg0phi5oRw0svKILWQnY0hDaEJSv/w38m/UXtKFh5SLkZZPBTxklJbPB3IB3wVDc84zI5p8Mg6p7SFRFvmyYaqkRDVA+ZaCAaNlEGrPtiDu9Ne4gVaz8KAlZEuxkHWQb/MzhpiR00MH1tWRk0btJX2p47kDr1OiI6RL6yqZ8TAhM+376cybOGM3/p60rrZDnVPoMM/pdw0hM7aKgyUwT10hs3PvMKadZqAC1O74xduIzpnz7Lp8veUrbjHRV0QO3OSOkMMjjJoVBG+lGiBrVrt8GyDiSFM4xjP2o0gwwyOKmgvFM20xQOw7D4L1JAMsggg6PBs6MzhM4ggwwyyCCDDDLI4L8N/x9kMip2CQfghgAAAB50RVh0aWNjOmNvcHlyaWdodABHb29nbGUgSW5jLiAyMDE2rAszOAAAABR0RVh0aWNjOmRlc2NyaXB0aW9uAHNSR0K6kHMHAAAAAElFTkSuQmCC";
export default function Dashboard() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Solvera Scan State
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState({}); // { idx: 'base' | 'pair' }
  const { theme, toggleTheme, lang, toggleLang } = useAppContext();
  const t = dict[lang] || dict.en;

  const [mob, setMob] = useState(false);
  useEffect(() => { const c = () => setMob(window.innerWidth < 768); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c); }, []);

  const fetchTokens = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const url = query 
        ? `/api/dexscreener/proxy?query=${encodeURIComponent(query)}`
        : `/api/dexscreener/proxy`; // Default top pairs
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tokens');
      setTokens(data.pairs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens(); // Initial load
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTokens(searchQuery);
  };

  const handleScan = async (address) => {
    setScanModalOpen(true);
    setScanLoading(true);
    setScanError('');
    setScanResult(null);
    try {
      const res = await fetch(`/api/wallet/${encodeURIComponent(address)}`);
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScanResult(data);
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanLoading(false);
    }
  };

  const closeModal = () => {
    setScanModalOpen(false);
    setScanResult(null);
    setScanError('');
  };

  return (
    <>
      <Head>
        <title>{t.demoTitle} — Solvera</title>
      </Head>
      <div style={{ minHeight: "100vh", background: "var(--bg-main)", backgroundImage: "radial-gradient(circle at 1px 1px, var(--border-light) 1px, transparent 0)", backgroundSize: "24px 24px", color: "var(--text-main)", fontFamily: "'Inter',system-ui,sans-serif", overflow: "hidden" }}>
        
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: mob ? "16px 20px" : "20px 40px", position: "sticky", top: 0, zIndex: 50, background: "var(--bg-nav)", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/"><img src={LOGO_H} alt="Solvera" style={{ height: mob ? 36 : 44 }} /></Link>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!mob && <a href="https://t.me/solverahq" target="_blank" rel="noopener noreferrer" style={{ padding: "10px 20px", fontSize: 13, background: "transparent", color: "#94A3B8", fontWeight: 500, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#94A3B8"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.203-.657-.643.136-.953l11.566-4.458c.537-.194 1.006.131.832.94z"/></svg>
              Community
            </a>}
            <a href="https://rise.rich/trade/H2goTkKAr13GZC5q1c28QM8jCHGLj2cFNzQKtabGrise" target="_blank" rel="noopener noreferrer" style={{ padding: "10px 20px", fontSize: 13, background: "#818CF8", color: "#ffffff", fontWeight: 600, border: "none", borderRadius: 10, cursor: "pointer", textDecoration: "none", boxShadow: "0 4px 14px 0 rgba(129, 140, 248, 0.39)" }}>$SOLVERA</a>
            <Link href="/" style={{ padding: "10px 20px", fontSize: 13, background: "#0A4C5E", color: "#F7F1E8", fontWeight: 600, border: "none", borderRadius: 10, cursor: "pointer", textDecoration: "none" }}>Scanner</Link>
            <button onClick={toggleTheme} style={{ padding: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Toggle Theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={toggleLang} style={{ padding: "8px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#94A3B8", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {lang === 'en' ? '中' : 'EN'}
            </button>
          </div>
        </nav>

        <div style={{ padding: mob ? "40px 20px" : "80px 40px", maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <div style={{ marginBottom: "40px" }}>
            <h1 style={{ fontSize: "clamp(28px, 7vw, 56px)", fontWeight: 600, lineHeight: 1.1, marginBottom: 16, letterSpacing: "-0.02em", fontFamily: "'Fraunces', Georgia, serif", color: "var(--text-main)" }}>
              {t.heroTitle1}<br /><span style={{ background: "linear-gradient(135deg, #0A4C5E, #B8691C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{t.heroTitle2}</span>
            </h1>
          </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={`${styles.card} ${mob ? styles.cardMobile : ''}`} style={{ textAlign: "left", background: "var(--bg-card)", borderColor: "var(--border-card)" }}>
        <div className={`${styles.flexBetween} ${mob ? styles.flexBetweenMobile : ''}`}>
          <h2 className={styles.cardTitle} style={{ color: "var(--text-main)" }}>Market Pairs (DexScreener)</h2>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', width: mob ? '100%' : 'auto' }}>
            <input 
              type="text" 
              className={styles.input} 
              style={{ marginBottom: 0, width: mob ? '100%' : '250px', background: "var(--bg-main)", color: "var(--text-main)", borderColor: "var(--border-light)" }}
              placeholder="Search token address or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className={styles.button}>Search</button>
          </form>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading market data...</p>
        ) : tokens.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No pairs found.</p>
        ) : (
          <div className={`${styles.grid} ${mob ? styles.gridMobile : ''}`}>
            {tokens.map((pair, idx) => {
              const targetType = selectedTargets[idx] || 'base';
              const targetAddress = targetType === 'base' ? pair.baseToken.address : pair.pairAddress;
              return (
                <div key={idx} className={styles.tokenCard} style={{ background: "var(--bg-main)", borderColor: "var(--border-light)" }}>
                  <div className={styles.tokenHeader}>
                    <span className={styles.tokenName} style={{ color: "var(--text-main)" }}>{pair.baseToken.symbol}/{pair.quoteToken.symbol}</span>
                    <span className={styles.tokenChain} style={{ background: "var(--bg-badge)", color: "var(--text-muted)", borderColor: "var(--border-light)" }}>{pair.chainId}</span>
                  </div>
                  <div className={styles.tokenPrice} style={{ color: "var(--text-main)" }}>
                    ${parseFloat(pair.priceUsd).toFixed(4)}
                  </div>
                  <div className={styles.tokenHeader}>
                    <span className={styles.subtitle} style={{ color: "var(--text-dim)" }}>Vol 24h: ${pair.volume?.h24?.toLocaleString() || 0}</span>
                    <span className={`${styles.tokenChange} ${pair.priceChange?.h24 >= 0 ? styles.positive : styles.negative}`}>
                      {pair.priceChange?.h24 >= 0 ? '+' : ''}{pair.priceChange?.h24 || 0}%
                    </span>
                  </div>
                  
                  {/* Solvera Scan UI Integration */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Solvera Risk Scan
                    </div>
                    <select 
                      value={targetType}
                      onChange={(e) => setSelectedTargets(prev => ({ ...prev, [idx]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', background: "var(--bg-card)", color: "var(--text-main)", marginBottom: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <option value="base">Scan Contract: {pair.baseToken.address.slice(0,6)}...{pair.baseToken.address.slice(-4)}</option>
                      <option value="pair">Scan LP Pool: {pair.pairAddress.slice(0,6)}...{pair.pairAddress.slice(-4)}</option>
                    </select>
                    <button 
                      onClick={() => handleScan(targetAddress)}
                      style={{ width: '100%', padding: '8px 12px', backgroundColor: '#0A4C5E', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      🔍 {t.demoBtnScan}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Solvera Result Modal */}
      {scanModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mob ? "20px" : 0 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: mob ? '1.5rem' : '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: "1px solid var(--border-light)" }}>
            <button onClick={closeModal} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Scan Result</h3>
            
            {scanLoading && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ width: 30, height: 30, border: '3px solid var(--border-light)', borderTop: '3px solid #0A4C5E', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analyzing on-chain behavior...</p>
              </div>
            )}

            {scanError && (
              <div style={{ padding: '1rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.9rem' }}>
                {scanError}
              </div>
            )}

            {scanResult && !scanLoading && (
              scanResult.risk?.flags?.some(f => f.label === "PROGRAM ACCOUNT") ? (
                <div style={{ textAlign: "center", padding: "1rem" }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔷</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, marginBottom: '0.5rem' }}>PROGRAM ACCOUNT</div>
                  <p style={{ fontSize: '0.85rem', color: "var(--text-dim)", lineHeight: 1.5 }}>
                    This is a Solana smart contract, not a user wallet. It processes transactions rather than initiating them.
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: scanResult.risk?.level === "LOW" ? "#2D7A4F" : scanResult.risk?.level === "MODERATE" ? "#B8861C" : scanResult.risk?.level === "ELEVATED" ? "#C2541C" : "#B8321C" }}>
                    {scanResult.risk?.score} <span style={{ fontSize: '1.25rem', color: 'var(--text-dim)', fontWeight: 600 }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: scanResult.risk?.level === "LOW" ? "#2D7A4F" : scanResult.risk?.level === "MODERATE" ? "#B8861C" : scanResult.risk?.level === "ELEVATED" ? "#C2541C" : "#B8321C", letterSpacing: '0.05em', marginBottom: '1.5rem', marginTop: '0.25rem' }}>
                    {scanResult.risk?.level} RISK
                  </div>

                  {scanResult.risk?.flags?.filter(f => f.type === "danger" || f.type === "warn").length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                      {scanResult.risk.flags.filter(f => f.type === "danger" || f.type === "warn").map((flag, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '999px', backgroundColor: flag.type === 'danger' ? 'rgba(184,50,28,0.1)' : 'rgba(184,134,28,0.1)', color: flag.type === 'danger' ? '#b91c1c' : '#a16207', border: `1px solid ${flag.type === 'danger' ? 'rgba(184,50,28,0.2)' : 'rgba(184,134,28,0.2)'}` }}>
                          {flag.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No high-risk signals detected.</p>
                  )}
                  
                  <div style={{ marginTop: '1.5rem' }}>
                    <a href={`/?scan=${scanResult.address}`} style={{ display: 'inline-block', width: '100%', padding: '10px 0', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-light)', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                      View Full Analysis &rarr;
                    </a>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
      </div>
    </>
  );
}
