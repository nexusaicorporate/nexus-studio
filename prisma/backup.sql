--
-- PostgreSQL database dump
--

\restrict hVSrofa1AqlmVgwPdCDg8XpG1CbRLWxC7u92AyFukVHQVgC2re6jGXxYxFgu90a

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."UserSettings" DROP CONSTRAINT IF EXISTS "UserSettings_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Template" DROP CONSTRAINT IF EXISTS "Template_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Prompt" DROP CONSTRAINT IF EXISTS "Prompt_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Ingredient" DROP CONSTRAINT IF EXISTS "Ingredient_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Bank" DROP CONSTRAINT IF EXISTS "Bank_userId_fkey";
DROP INDEX IF EXISTS public."User_email_key";
DROP INDEX IF EXISTS public."UserSettings_userId_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."UserSettings" DROP CONSTRAINT IF EXISTS "UserSettings_pkey";
ALTER TABLE IF EXISTS ONLY public."Template" DROP CONSTRAINT IF EXISTS "Template_pkey";
ALTER TABLE IF EXISTS ONLY public."Prompt" DROP CONSTRAINT IF EXISTS "Prompt_pkey";
ALTER TABLE IF EXISTS ONLY public."Ingredient" DROP CONSTRAINT IF EXISTS "Ingredient_pkey";
ALTER TABLE IF EXISTS ONLY public."Bank" DROP CONSTRAINT IF EXISTS "Bank_pkey";
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."UserSettings";
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."Template";
DROP TABLE IF EXISTS public."Prompt";
DROP TABLE IF EXISTS public."Ingredient";
DROP TABLE IF EXISTS public."Bank";
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Bank; Type: TABLE; Schema: public; Owner: nexus_app
--

CREATE TABLE public."Bank" (
    id text NOT NULL,
    "userId" text,
    name text NOT NULL,
    category text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    nsfw boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Bank" OWNER TO nexus_app;

--
-- Name: Ingredient; Type: TABLE; Schema: public; Owner: nexus_app
--

CREATE TABLE public."Ingredient" (
    id text NOT NULL,
    "userId" text,
    name text NOT NULL,
    category text NOT NULL,
    value text NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    nsfw boolean DEFAULT false NOT NULL,
    "mediaUrl" text,
    "mediaType" text,
    "triggerWord" text,
    description text,
    "refWeight" double precision,
    "influenceType" text,
    "negativeModifier" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ingredient" OWNER TO nexus_app;

--
-- Name: Prompt; Type: TABLE; Schema: public; Owner: nexus_app
--

CREATE TABLE public."Prompt" (
    id text NOT NULL,
    "userId" text,
    title text NOT NULL,
    category text NOT NULL,
    subcategory text,
    modes text[] DEFAULT ARRAY[]::text[],
    body text NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    nsfw boolean DEFAULT false NOT NULL,
    "mediaType" text DEFAULT 'image'::text,
    cover text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Prompt" OWNER TO nexus_app;

--
-- Name: Template; Type: TABLE; Schema: public; Owner: nexus_app
--

CREATE TABLE public."Template" (
    id text NOT NULL,
    "userId" text,
    name text NOT NULL,
    tokens jsonb DEFAULT '[]'::jsonb NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    nsfw boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Template" OWNER TO nexus_app;

--
-- Name: User; Type: TABLE; Schema: public; Owner: nexus_app
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    groups text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO nexus_app;

--
-- Name: UserSettings; Type: TABLE; Schema: public; Owner: nexus_app
--

CREATE TABLE public."UserSettings" (
    id text NOT NULL,
    "userId" text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserSettings" OWNER TO nexus_app;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: nexus_app
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO nexus_app;

--
-- Data for Name: Bank; Type: TABLE DATA; Schema: public; Owner: nexus_app
--

COPY public."Bank" (id, "userId", name, category, items, tags, nsfw, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Ingredient; Type: TABLE DATA; Schema: public; Owner: nexus_app
--

COPY public."Ingredient" (id, "userId", name, category, value, tags, nsfw, "mediaUrl", "mediaType", "triggerWord", description, "refWeight", "influenceType", "negativeModifier", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Prompt; Type: TABLE DATA; Schema: public; Owner: nexus_app
--

COPY public."Prompt" (id, "userId", title, category, subcategory, modes, body, tags, nsfw, "mediaType", cover, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Template; Type: TABLE DATA; Schema: public; Owner: nexus_app
--

COPY public."Template" (id, "userId", name, tokens, tags, nsfw, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: nexus_app
--

COPY public."User" (id, email, password, plan, groups, "createdAt", "updatedAt") FROM stdin;
cmrqsjjei00019inu25ri123y	test-studio@nexusaigear.com	$2b$12$yfK3YK9B7pDKziwpdbGIbeHwlVBM8Oi5L53PB1BwRXhnYJ9lzsX3i	studio	{dev,nsfw-plan}	2026-07-18 19:59:54.618	2026-07-18 19:59:54.618
cmrqsjj2400009inu8jg2pkys	cscannell@nexusaigear.com	$2b$12$Aw3WO13X/8hLDjsjyPfko.rjxzNFZxQB/vuNCHoNV9uIAQd4zyk5u	studio	{admin,dev}	2026-07-18 19:59:54.172	2026-07-18 19:59:56.37
\.


--
-- Data for Name: UserSettings; Type: TABLE DATA; Schema: public; Owner: nexus_app
--

COPY public."UserSettings" (id, "userId", data, "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: nexus_app
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
667a8f5a-1c0d-4a4b-8211-d85356fa3888	7e22b567535b07499cdc2ec1d6e7e1ca2d00166b40f68be3ffd12aaf008ed2f8	2026-07-18 15:59:52.288249-04	20260627112908_init	\N	\N	2026-07-18 15:59:52.217144-04	1
19293dfd-5770-4ae2-ae63-21ea2b350302	79c2a02e5f019f4e446c13b6605245349e37f166bb895fcf696681979f8d319d	2026-07-18 15:59:52.308452-04	20260706184129_add_user_settings	\N	\N	2026-07-18 15:59:52.289521-04	1
\.


--
-- Name: Bank Bank_pkey; Type: CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."Bank"
    ADD CONSTRAINT "Bank_pkey" PRIMARY KEY (id);


--
-- Name: Ingredient Ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."Ingredient"
    ADD CONSTRAINT "Ingredient_pkey" PRIMARY KEY (id);


--
-- Name: Prompt Prompt_pkey; Type: CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."Prompt"
    ADD CONSTRAINT "Prompt_pkey" PRIMARY KEY (id);


--
-- Name: Template Template_pkey; Type: CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."Template"
    ADD CONSTRAINT "Template_pkey" PRIMARY KEY (id);


--
-- Name: UserSettings UserSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: UserSettings_userId_key; Type: INDEX; Schema: public; Owner: nexus_app
--

CREATE UNIQUE INDEX "UserSettings_userId_key" ON public."UserSettings" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: nexus_app
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Bank Bank_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."Bank"
    ADD CONSTRAINT "Bank_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Ingredient Ingredient_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."Ingredient"
    ADD CONSTRAINT "Ingredient_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Prompt Prompt_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."Prompt"
    ADD CONSTRAINT "Prompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Template Template_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."Template"
    ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserSettings UserSettings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexus_app
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hVSrofa1AqlmVgwPdCDg8XpG1CbRLWxC7u92AyFukVHQVgC2re6jGXxYxFgu90a

